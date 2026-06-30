let chartInstance = null;
let chartReady = null;

// Load Chart.js once globally (promise cached)
async function getChart() {
  if (!chartReady) {
    chartReady = import('https://cdn.jsdelivr.net/npm/chart.js');
  }
  return chartReady;
}

export function initHealthRenderer() {
  Store.subscribe('health', async (data) => {
    if (!data) return;

    const { Chart, registerables } = await getChart();

    // register ONCE (safe guard)
    if (!Chart._registered) {
      Chart.register(...registerables);
      Chart._registered = true;
    }

    const ctx = document.getElementById('healthChart');

    // destroy old instance (critical)
    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Health',
          data: data.values
        }]
      }
    });
  });
}
