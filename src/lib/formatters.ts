export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(date);
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(date);
  }
}

export function cleanJenjang(val: string | null | undefined): string {
  if (!val) return 'SMP';
  const s = String(val).toUpperCase();
  if (s.includes('TK') || s.includes('STK') || s.includes('PAUD')) return 'TK';
  if (s.includes('SD')) return 'SD';
  if (s.includes('SMP') || s.includes('MTS')) return 'SMP';
  if (s.includes('SMA') || s.includes('SMK') || s.includes('MA')) return 'SMA';
  return 'SMP';
}
