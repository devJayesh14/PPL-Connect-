export function formatCurrency(amount: number | undefined | null, symbol = '₹'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return `${symbol}0`;
  return `${symbol}${Number(amount).toLocaleString('en-IN')}`;
}

export function formatCompactCurrency(amount: number | undefined | null, symbol = '₹'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return `${symbol}0`;
  const val = Number(amount);
  if (val >= 10000000) {
    return `${symbol}${(val / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  }
  if (val >= 100000) {
    return `${symbol}${(val / 100000).toFixed(2).replace(/\.00$/, '')} L`;
  }
  if (val >= 1000) {
    return `${symbol}${(val / 1000).toFixed(1).replace(/\.0$/, '')} K`;
  }
  return `${symbol}${val.toLocaleString('en-IN')}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateString;
  }
}
