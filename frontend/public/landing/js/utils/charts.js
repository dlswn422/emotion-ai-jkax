export function buildSparklinePath(values, w, h) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return `${x},${y}`;
  });

  return `M ${pts.join(' L ')}`;
}

export function destroyChart(inst) {
  try {
    if (inst) inst.destroy();
  } catch (e) {}
}