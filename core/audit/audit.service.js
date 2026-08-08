import { supabase } from '/js/supabase.js';

let queue = []; // Array of { event, retries }
let flushTimer = null;
let isFlushing = false;
let currentAccessToken = null; // Cached for synchronous keepalive access

const FLUSH_INTERVAL = 1000;
const MAX_RETRIES = 3;
const MAX_KEEPALIVE_BYTES = 60 * 1024; // 60KB safe margin for 64KB browser limit
const NORMAL_BATCH_SIZE = 50;

const SENSITIVE_REGEX = /password|token|secret|creditcard|cvv|ssn|apikey|authorization|auth/i;
const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

function getByteLength(str) {
  if (textEncoder) return textEncoder.encode(str).length;
  // Manual UTF-8 byte length calculation fallback
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code <= 0x7F) bytes += 1;
    else if (code <= 0x7FF) bytes += 2;
    else if (code >= 0xD800 && code <= 0xDFFF) { bytes += 4; i++; } // Surrogate pair
    else bytes += 3;
  }
  return bytes;
}

function sanitizeMetadata(metadata, seen = new WeakSet()) {
  if (metadata === null || metadata === undefined) return metadata;
  if (metadata instanceof Date) return metadata.toISOString();
  if (typeof metadata !== 'object') return metadata;
  
  if (seen.has(metadata)) return '[Circular Reference]';
  seen.add(metadata);

  if (Array.isArray(metadata)) {
    return metadata.map(item => sanitizeMetadata(item, seen));
  }

  if (Object.prototype.toString.call(metadata) !== '[object Object]') {
      return `[${metadata.constructor?.name || 'Object'}]`;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeMetadata(value, seen);
    }
  }
  return sanitized;
}

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (currentAccessToken) {
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }
  return headers;
}

function getFunctionUrl() {
  const baseUrl = supabase.supabaseUrl.endsWith('/') ? supabase.supabaseUrl.slice(0, -1) : supabase.supabaseUrl;
  return `${baseUrl}/functions/v1/audit-logger`;
}

// Synchronous fire-and-forget for page hide/unload to bypass async locks
function flushKeepalive() {
  if (queue.length === 0) return;
  
  const itemsToProcess = [...queue];
  queue = []; // Clear immediately to prevent duplicate sends
  
  let currentChunk = [];
  let currentSize = 20; // Buffer for '{"events":[]}' wrapper
  const headers = buildHeaders();
  const url = getFunctionUrl();

  for (const item of itemsToProcess) {
    const itemStr = JSON.stringify(item.event);
    const itemSize = getByteLength(itemStr);
    
    if (currentSize + itemSize + 2 > MAX_KEEPALIVE_BYTES && currentChunk.length > 0) {
      fireKeepaliveRequest(url, headers, currentChunk);
      currentChunk = [];
      currentSize = 20;
    }
    currentChunk.push(item.event);
    currentSize += itemSize + 2;
  }
  
  if (currentChunk.length > 0) {
    fireKeepaliveRequest(url, headers, currentChunk);
  }
}

function fireKeepaliveRequest(url, headers, payload) {
  try {
    fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events: payload }),
      keepalive: true
    }).catch(err => console.warn('Keepalive audit batch failed:', err));
  } catch (err) {
    console.error('Synchronous keepalive fetch failed:', err);
  }
}

async function flushQueue() {
  if (queue.length === 0 || isFlushing) return;
  
  isFlushing = true;
  
  const batchItems = [];
  
  while (queue.length > 0 && batchItems.length < NORMAL_BATCH_SIZE) {
    batchItems.push(queue.shift());
  }

  if (batchItems.length === 0) {
    isFlushing = false;
    return;
  }

  const batchPayload = batchItems.map(item => item.event);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      currentAccessToken = session.access_token;
    }

    const response = await fetch(getFunctionUrl(), {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ events: batchPayload })
    });

    if (response.status === 401 || response.status === 403) {
      console.warn('Audit auth error, attempting session refresh...');
      const { error, data } = await supabase.auth.refreshSession();
      if (!error && data.session) {
        currentAccessToken = data.session.access_token;
        queue = [...batchItems, ...queue]; // Put back for retry
        scheduleFlush(); // Ensure it gets picked up immediately
        return; 
      }
      console.error('Session refresh failed, dropping audit batch.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
  } catch (err) {
    console.warn('Audit batch failed, queueing for retry...', err);
    
    const retryItems = batchItems
      .map(item => ({ ...item, retries: item.retries + 1 }))
      .filter(item => {
        if (item.retries > MAX_RETRIES) {
          console.error('Audit event dropped after max retries:', item.event);
          return false;
        }
        return true;
      });
      
    queue = [...retryItems, ...queue];
  } finally {
    isFlushing = false;
    if (queue.length > 0 && !flushTimer) {
      scheduleFlush();
    }
  }
}

function scheduleFlush() {
  if (!flushTimer) {
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flushQueue();
    }, FLUSH_INTERVAL);
  }
}

export function logAudit(action, targetId, metadata = {}) {
  const event = {
    action,
    targetId,
    metadata: sanitizeMetadata(metadata),
    clientTimestamp: new Date().toISOString()
  };

  queue.push({ event, retries: 0 });
  scheduleFlush();
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushKeepalive();
  } else if (document.visibilityState === 'visible') {
    // Resume flushing if there are items in the queue and no active flush/timer
    if (queue.length > 0 && !flushTimer && !isFlushing) {
      scheduleFlush();
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

export function teardownAuditLogger() {
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  // Flush remaining items synchronously before teardown to prevent data loss
  flushKeepalive(); 
}
