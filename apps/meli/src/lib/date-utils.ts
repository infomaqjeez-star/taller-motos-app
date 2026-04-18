// Helper que SIEMPRE devuelve fecha/hora de Buenos Aires
export function getNowBA(): Date {
  const now = new Date();
  const baString = now.toLocaleString('en-US', { 
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  return new Date(baString);
}

export function getTodayBA(): Date {
  const d = getNowBA();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getTodayStringBA(): string {
  const d = getNowBA();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isSameDayBA(date1: Date, date2: Date): boolean {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

export function formatDateBA(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
