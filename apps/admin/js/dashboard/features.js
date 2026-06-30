// js/dashboard/features.js
export const FEATURES = {
  aiPrediction: true,
  newRevenueUI: false,
  kenyaHeatmap: true
};

export function isEnabled(flag) {
  return FEATURES[flag] === true;
}
