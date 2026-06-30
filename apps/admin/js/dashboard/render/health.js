export async function initHealthRenderer() {
  Store.subscribe('health', async (data) => {
    if (!data) return;
    // 12. Lazy load Chart.js only when needed
    const { Chart, registerables } = await import('https://cdn.jsdelivr.net/npm/chart.js');
    Chart.register(...registerables);
    // ... render chart
  });
}
