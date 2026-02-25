import type { ColumnId } from './types';

export const COLUMN_TITLES: Record<ColumnId, string> = {
  queue: 'Очередь',
  doing: 'Делаем',
  review: 'Проверка',
  done: 'Сделано',
};

export function fmtDelta(ms: number) {
  const safe = Math.max(0, ms);
  if (safe < 60_000) return '<1м';

  const totalMin = Math.floor(safe / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (h <= 0) return `${m}м`;
  return `${h}ч ${String(m).padStart(2, '0')}м`;
}

export function historyMoveText(
  title: string,
  fromCol: ColumnId,
  toCol: ColumnId,
  doingDeltaMs: number
) {
  let base = `Карточка "${title}" перемещена: "${COLUMN_TITLES[fromCol]}" → "${COLUMN_TITLES[toCol]}"`;

  if (toCol === 'doing' && fromCol !== 'doing') base += ` (таймер запущен)`;
  if (fromCol === 'doing' && toCol !== 'doing') base += ` (+${fmtDelta(doingDeltaMs)} в "Делаем")`;

  return base;
}

export function historyDeleteText(title: string, fromCol: ColumnId, doingDeltaMs: number) {
  let base = `Карточка "${title}" удалена`;
  if (fromCol === 'doing') base += ` (+${fmtDelta(doingDeltaMs)} в "Делаем")`;
  return base;
}

export function historyRestoreText(title: string, toCol: ColumnId) {
  let base = `Карточка "${title}" восстановлена в "${COLUMN_TITLES[toCol]}"`;
  if (toCol === 'doing') base += ` (таймер запущен)`;
  return base;
}
