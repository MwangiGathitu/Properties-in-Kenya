// =======================================================
// utils.js
// Shared Utility Library
// =======================================================

const FAVORITES_KEY = 'pik_favorites';

const state = {
  searchTimeout: null
};

// -------------------------------------------------------
// HTML Escaping
// -------------------------------------------------------
export function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// -------------------------------------------------------
// URL Validation
// -------------------------------------------------------
export function isValidUrl(string) {
  try {
    const url = new URL(string);
    return (
      url.protocol === 'http:' ||
      url.protocol === 'https:'
    );
  } catch {
    return false;
  }
}

// -------------------------------------------------------
// Safe Property Image
// -------------------------------------------------------
export function getSafeImage(property = {}) {
  const image =
    property.images?.[0] ||
    property.image_url;

  if (image && isValidUrl(image)) {
    return image;
  }

  return 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80';
}

// -------------------------------------------------------
// Kenya Currency Formatter
// -------------------------------------------------------
export function formatKES(amount = 0) {
  return `KSh ${Number(amount).toLocaleString()}`;
}

// -------------------------------------------------------
// Favorites
// -------------------------------------------------------
export function getFavorites() {
  try {
    return JSON.parse(
      localStorage.getItem(FAVORITES_KEY)
    ) || [];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites) {
  localStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify(favorites)
  );

  updateFavoritesCount();
}

export function updateFavoritesCount() {
  const count = getFavorites().length;

  document
    .querySelectorAll('.favorites-count')
    .forEach(el => {
      el.textContent = count;
      el.style.display =
        count > 0 ? 'flex' : 'none';
    });
}

// -------------------------------------------------------
// Debounce
// -------------------------------------------------------
export function debounce(fn, delay = 300) {
  return (...args) => {
    clearTimeout(state.searchTimeout);

    state.searchTimeout = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

// -------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------
export function showToast(
  message,
  type = 'info',
  duration = 3000
) {
  const container =
    document.getElementById('toastContainer');

  if (!container) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    return;
  }

  const toast = document.createElement('div');

  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');

    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}
