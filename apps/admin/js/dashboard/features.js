const FEATURES = {
  aiPrediction: true,
  newRevenueUI: false,
  kenyaHeatmap: true
};

export function isEnabled(flag, context = {}) {
  const value = FEATURES[flag];

  // explicit false or undefined = off
  if (value !== true) return false;

  // optional future hooks (role-based, user-based)
  if (context.role && flag === 'aiPrediction') {
    if (context.role !== 'admin') return false;
  }

  return true;
}

export function getAllFeatures() {
  return { ...FEATURES };
}
