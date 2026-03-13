export function fmtDate(d) {
  return d ? d.replace(/-/g, '.') : '';
}

export function starsStr(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}