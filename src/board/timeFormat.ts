export function formatDoingDuration(ms: number, lang: 'ru' | 'en' = 'ru'): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const totalHours = Math.floor(totalSec / 3600);

  if (totalHours < 24) {
    const h = totalHours;
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return lang === 'en' ? `${days}d / ${String(hours).padStart(2, '0')}h` : `${days}д / ${String(hours).padStart(2, '0')}ч`;
}
