import type { BoardState, ColumnId, Card } from './types';

const COLUMN_ORDER: ColumnId[] = ['queue', 'doing', 'review', 'done'];
const dtFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function isColumnId(x: string): x is ColumnId {
  return x === 'queue' || x === 'doing' || x === 'review' || x === 'done';
}

export function findColumnOfCard(cardId: string, cols: BoardState['columns']): ColumnId | null {
  if (cols.queue.includes(cardId)) return 'queue';
  if (cols.doing.includes(cardId)) return 'doing';
  if (cols.review.includes(cardId)) return 'review';
  if (cols.done.includes(cardId)) return 'done';
  return null;
}

export function buildCardColumnMap(cols: BoardState['columns']): Map<string, ColumnId> {
  const map = new Map<string, ColumnId>();

  for (const col of COLUMN_ORDER) {
    for (const id of cols[col]) map.set(id, col);
  }

  return map;
}

export function formatDT(ts: number) {
  return dtFormatter.format(ts);
}

export function computeDoingMs(card: Card, now: number) {
  return card.doingTotalMs + (card.doingStartedAt != null ? Math.max(0, now - card.doingStartedAt) : 0);
}
