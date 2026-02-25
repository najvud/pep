import type { BoardState, Card, CardStatus, ColumnId, HistoryEntry } from './types';
import type { BoardAction } from './actions';
import { historyDeleteText, historyMoveText, historyRestoreText } from './historyText';
import { sanitizeCardImages } from './cardImages';

const HISTORY_LIMIT = 40;
const MAX_COMMENTS_PER_CARD = 200;
const MAX_COMMENT_TEXT_LEN = 4000;
const MAX_CHECKLIST_ITEMS_PER_CARD = 120;
const MAX_CHECKLIST_ITEM_TEXT_LEN = 220;

const COLUMN_ORDER: ColumnId[] = ['queue', 'doing', 'review', 'done'];

type CardPosition = { col: ColumnId; index: number };

function addHistory(prev: HistoryEntry[] | undefined, entry: HistoryEntry): HistoryEntry[] {
  const list = prev ?? [];
  const next = [entry, ...list];
  return next.slice(0, HISTORY_LIMIT);
}

function removeAt(arr: string[], index: number): string[] {
  const next = arr.slice();
  next.splice(index, 1);
  return next;
}

function normalizeCommentAuthor(raw: unknown): string | null {
  const author = String(raw ?? '').trim();
  return author ? author.slice(0, 64) : null;
}

function normalizeCardCreator(raw: unknown): string | null {
  const createdBy = String(raw ?? '').trim();
  return createdBy ? createdBy.slice(0, 64) : null;
}

function normalizeCardFavorite(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw !== 0;
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
  return false;
}

function normalizeComments(raw: unknown): Card['comments'] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: Card['comments'] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;

    const id = String((item as { id?: unknown }).id ?? '').trim();
    const text = String((item as { text?: unknown }).text ?? '').trim();
    const images = normalizeCardImages((item as { images?: unknown }).images);
    const createdAtRaw = Number((item as { createdAt?: unknown }).createdAt);
    if (!id || seen.has(id)) continue;
    if (!text && images.length === 0) continue;

    seen.add(id);
    out.push({
      id,
      text: text.slice(0, MAX_COMMENT_TEXT_LEN),
      images,
      createdAt: Number.isFinite(createdAtRaw) ? Math.max(0, Math.trunc(createdAtRaw)) : Date.now(),
      updatedAt: Number.isFinite(Number((item as { updatedAt?: unknown }).updatedAt))
        ? Math.max(
            Number.isFinite(createdAtRaw) ? Math.max(0, Math.trunc(createdAtRaw)) : Date.now(),
            Math.trunc(Number((item as { updatedAt?: unknown }).updatedAt))
          )
        : undefined,
      author: normalizeCommentAuthor((item as { author?: unknown }).author),
    });
  }

  out.sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.id.localeCompare(b.id);
  });

  return out.length > MAX_COMMENTS_PER_CARD ? out.slice(out.length - MAX_COMMENTS_PER_CARD) : out;
}

function sameCommentImages(left: Card['images'], right: Card['images']) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    const a = left[i];
    const b = right[i];
    if (
      a.id !== b.id ||
      a.dataUrl !== b.dataUrl ||
      a.mime !== b.mime ||
      a.size !== b.size ||
      a.name !== b.name ||
      a.createdAt !== b.createdAt ||
      (a.fileId ?? null) !== (b.fileId ?? null) ||
      (a.previewFileId ?? null) !== (b.previewFileId ?? null) ||
      (a.previewUrl ?? '') !== (b.previewUrl ?? '') ||
      (a.previewMime ?? '') !== (b.previewMime ?? '') ||
      (a.previewSize ?? 0) !== (b.previewSize ?? 0)
    ) {
      return false;
    }
  }
  return true;
}

function normalizeCardImages(raw: unknown): Card['images'] {
  return sanitizeCardImages(raw);
}

function normalizeChecklist(raw: unknown): Card['checklist'] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: Card['checklist'] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;

    const id = String((item as { id?: unknown }).id ?? '').trim();
    const text = String((item as { text?: unknown }).text ?? '')
      .trim()
      .slice(0, MAX_CHECKLIST_ITEM_TEXT_LEN);
    const createdAtRaw = Number((item as { createdAt?: unknown }).createdAt);
    const doneRaw = (item as { done?: unknown }).done;

    if (!id || seen.has(id) || !text) continue;

    seen.add(id);
    out.push({
      id,
      text,
      done: doneRaw === true,
      createdAt: Number.isFinite(createdAtRaw) ? Math.max(0, Math.trunc(createdAtRaw)) : Date.now(),
    });
  }

  out.sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.id.localeCompare(b.id);
  });

  return out.length > MAX_CHECKLIST_ITEMS_PER_CARD ? out.slice(0, MAX_CHECKLIST_ITEMS_PER_CARD) : out;
}

function insertAt(arr: string[], index: number, value: string): string[] {
  const next = arr.slice();
  const safe = Math.min(Math.max(index, 0), next.length);
  next.splice(safe, 0, value);
  return next;
}

function moveWithin(arr: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex < 0 || fromIndex >= arr.length) return arr;

  const next = arr.slice();
  const [value] = next.splice(fromIndex, 1);
  const safeTo = Math.min(Math.max(toIndex, 0), next.length);
  next.splice(safeTo, 0, value);
  return next;
}

function removeFromAllColumns(columns: BoardState['columns'], cardId: string): BoardState['columns'] {
  let changed = false;
  const next: BoardState['columns'] = { ...columns };

  for (const col of COLUMN_ORDER) {
    const arr = columns[col];
    const index = arr.indexOf(cardId);
    if (index < 0) {
      next[col] = arr;
      continue;
    }

    changed = true;
    next[col] = removeAt(arr, index);
  }

  return changed ? next : columns;
}

function removeFromFloating(
  floatingById: BoardState['floatingById'],
  cardId: string
): BoardState['floatingById'] {
  if (!Object.prototype.hasOwnProperty.call(floatingById, cardId)) return floatingById;
  const next = { ...floatingById };
  delete next[cardId];
  return next;
}

function normalizePin(
  raw: unknown,
  fallback: { x: number; y: number; swayOffsetMs: number }
): { x: number; y: number; swayOffsetMs: number } {
  if (!raw || typeof raw !== 'object') return fallback;
  const x = Number((raw as { x?: unknown }).x);
  const y = Number((raw as { y?: unknown }).y);
  const swayOffsetMs = Number((raw as { swayOffsetMs?: unknown }).swayOffsetMs);
  return {
    x: Number.isFinite(x) ? Math.round(x) : fallback.x,
    y: Number.isFinite(y) ? Math.round(y) : fallback.y,
    swayOffsetMs:
      Number.isFinite(swayOffsetMs) && swayOffsetMs >= 0 ? Math.round(swayOffsetMs) : fallback.swayOffsetMs,
  };
}

function fallbackPinForIndex(index: number) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: 24 + col * 268,
    y: 124 + row * 146,
    swayOffsetMs: (index * 187) % 2400,
  };
}

function normalizeFloatingByState(
  nextState: BoardState,
  prevFloating: BoardState['floatingById']
): BoardState['floatingById'] {
  const nextFloating: BoardState['floatingById'] = {};
  let orphanCounter = 0;

  for (const [id, rawPin] of Object.entries(nextState.floatingById ?? {})) {
    if (!nextState.cardsById[id]) continue;
    if (findCardPosition(id, nextState.columns)) continue;
    nextFloating[id] = normalizePin(rawPin, fallbackPinForIndex(orphanCounter));
    orphanCounter += 1;
  }

  for (const id of Object.keys(nextState.cardsById)) {
    if (findCardPosition(id, nextState.columns)) continue;
    if (nextFloating[id]) continue;

    const fallback = prevFloating[id]
      ? normalizePin(prevFloating[id], fallbackPinForIndex(orphanCounter))
      : fallbackPinForIndex(orphanCounter);
    nextFloating[id] = fallback;
    orphanCounter += 1;
  }

  return nextFloating;
}

function findCardPosition(cardId: string, cols: BoardState['columns']): CardPosition | null {
  for (const col of COLUMN_ORDER) {
    const index = cols[col].indexOf(cardId);
    if (index >= 0) return { col, index };
  }
  return null;
}

function withCardStatus(card: Card, status: CardStatus): Card {
  return card.status === status ? card : { ...card, status };
}

function deriveCardStatus(
  cardId: string,
  columns: BoardState['columns'],
  floatingById: BoardState['floatingById']
): CardStatus {
  const pos = findCardPosition(cardId, columns);
  if (pos) return pos.col;
  if (Object.prototype.hasOwnProperty.call(floatingById, cardId)) return 'freedom';
  return 'queue';
}

function syncCardsByStatus(
  cardsById: BoardState['cardsById'],
  columns: BoardState['columns'],
  floatingById: BoardState['floatingById']
): BoardState['cardsById'] {
  let changed = false;
  const next: BoardState['cardsById'] = {};

  for (const [id, card] of Object.entries(cardsById)) {
    const status = deriveCardStatus(id, columns, floatingById);
    if (card.status !== status) {
      changed = true;
      next[id] = { ...card, status };
    } else {
      next[id] = card;
    }
  }

  return changed ? next : cardsById;
}

function applyDoingTransition(card: Card, fromCol: ColumnId, toCol: ColumnId, now: number): [Card, number] {
  let updated = card;
  let doingDeltaMs = 0;

  if (fromCol === 'doing' && toCol !== 'doing') {
    if (updated.doingStartedAt != null) {
      doingDeltaMs = Math.max(0, now - updated.doingStartedAt);
      updated = {
        ...updated,
        doingTotalMs: updated.doingTotalMs + doingDeltaMs,
        doingStartedAt: null,
      };
    } else {
      updated = { ...updated, doingStartedAt: null };
    }
  }

  if (toCol === 'doing' && fromCol !== 'doing') {
    updated = { ...updated, doingStartedAt: now };
  }

  if (toCol !== 'doing' && updated.doingStartedAt != null) {
    updated = { ...updated, doingStartedAt: null };
  }

  return [updated, doingDeltaMs];
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'STATE_REPLACE': {
      const nextCardsById: BoardState['cardsById'] = {};
      for (const [id, card] of Object.entries(action.state.cardsById ?? {})) {
        nextCardsById[id] = {
          ...card,
          createdBy: normalizeCardCreator((card as { createdBy?: unknown }).createdBy),
          isFavorite: normalizeCardFavorite((card as { isFavorite?: unknown }).isFavorite),
          comments: normalizeComments((card as { comments?: unknown }).comments),
          images: normalizeCardImages((card as { images?: unknown }).images),
          checklist: normalizeChecklist((card as { checklist?: unknown }).checklist),
        };
      }

      const nextState = {
        ...action.state,
        cardsById: nextCardsById,
        floatingById: normalizeFloatingByState(
          {
            ...action.state,
            cardsById: nextCardsById,
            floatingById: action.state.floatingById ?? {},
          },
          state.floatingById ?? {}
        ),
      };
      return {
        ...nextState,
        cardsById: syncCardsByStatus(nextState.cardsById, nextState.columns, nextState.floatingById),
      };
    }

    case 'CARD_CREATE': {
      const card: Card = {
        id: action.cardId,
        title: action.title,
        description: action.description,
        images: normalizeCardImages(action.images),
        createdBy: normalizeCardCreator(action.createdBy),
        createdAt: action.now,
        status: 'queue',
        urgency: action.urgency,
        isFavorite: false,
        comments: [],
        checklist: [],
        doingStartedAt: null,
        doingTotalMs: 0,
      };

      const nextCards = { ...state.cardsById, [card.id]: card };
      const nextColumns = {
        ...state.columns,
        queue: [card.id, ...state.columns.queue],
      };

      const title = card.title || 'Без названия';
      const entry: HistoryEntry = {
        id: action.historyId,
        at: action.now,
        text: `Карточка "${title}" создана в "Очередь"`,
        cardId: card.id,
        kind: 'create',
        meta: {
          title: card.title.trim(),
          fromCol: null,
          toCol: 'queue',
          doingDeltaMs: 0,
        },
      };

      return {
        ...state,
        cardsById: nextCards,
        columns: nextColumns,
        floatingById: removeFromFloating(state.floatingById, card.id),
        history: addHistory(state.history, entry),
      };
    }

    case 'CARD_UPDATE': {
      const old = state.cardsById[action.cardId];
      if (!old) return state;

      return {
        ...state,
        cardsById: {
          ...state.cardsById,
          [action.cardId]: {
            ...old,
            title: action.patch.title,
            description: action.patch.description,
            images: normalizeCardImages(action.patch.images),
          },
        },
      };
    }

    case 'CARD_CHECKLIST_SET': {
      const old = state.cardsById[action.cardId];
      if (!old) return state;

      const checklist = normalizeChecklist(action.checklist);
      const prevChecklist = normalizeChecklist(old.checklist);

      if (
        prevChecklist.length === checklist.length &&
        prevChecklist.every(
          (item, index) =>
            item.id === checklist[index]?.id &&
            item.text === checklist[index]?.text &&
            item.done === checklist[index]?.done &&
            item.createdAt === checklist[index]?.createdAt
        )
      ) {
        return state;
      }

      return {
        ...state,
        cardsById: {
          ...state.cardsById,
          [action.cardId]: {
            ...old,
            checklist,
          },
        },
      };
    }

    case 'CARD_TOGGLE_FAVORITE': {
      const card = state.cardsById[action.cardId];
      if (!card) return state;
      return {
        ...state,
        cardsById: {
          ...state.cardsById,
          [action.cardId]: {
            ...card,
            isFavorite: !card.isFavorite,
          },
        },
      };
    }

    case 'CARD_COMMENT_ADD': {
      const card = state.cardsById[action.cardId];
      if (!card) return state;

      const commentId = String(action.comment.id ?? '').trim();
      const commentText = String(action.comment.text ?? '')
        .trim()
        .slice(0, MAX_COMMENT_TEXT_LEN);
      const commentImages = normalizeCardImages(action.comment.images);
      const createdAtRaw = Number(action.comment.createdAt);
      const createdAt = Number.isFinite(createdAtRaw) ? Math.max(0, Math.trunc(createdAtRaw)) : Date.now();
      const updatedAtRaw = Number(action.comment.updatedAt);
      const updatedAt = Number.isFinite(updatedAtRaw) ? Math.max(createdAt, Math.trunc(updatedAtRaw)) : createdAt;
      if (!commentId) return state;
      if (!commentText && commentImages.length === 0) return state;

      const comments = normalizeComments((card as { comments?: unknown }).comments);
      if (comments.some((c) => c.id === commentId)) return state;

      const nextComments = normalizeComments([
        ...comments,
        {
          id: commentId,
          text: commentText,
          images: commentImages,
          createdAt,
          updatedAt,
          author: normalizeCommentAuthor(action.comment.author),
        },
      ]);

      const nextCard: Card = {
        ...card,
        comments: nextComments,
      };

      return {
        ...state,
        cardsById: { ...state.cardsById, [card.id]: nextCard },
      };
    }

    case 'CARD_COMMENT_UPDATE': {
      const card = state.cardsById[action.cardId];
      if (!card) return state;

      const commentId = String(action.commentId ?? '').trim();
      const commentText = String(action.text ?? '')
        .trim()
        .slice(0, MAX_COMMENT_TEXT_LEN);
      const commentImages = normalizeCardImages(action.images);
      if (!commentId) return state;
      if (!commentText && commentImages.length === 0) return state;

      const comments = normalizeComments((card as { comments?: unknown }).comments);
      const targetIndex = comments.findIndex((comment) => comment.id === commentId);
      if (targetIndex < 0) return state;

      if (comments[targetIndex].text === commentText && sameCommentImages(comments[targetIndex].images, commentImages)) {
        return state;
      }

      const nextComments = comments.slice();
      nextComments[targetIndex] = {
        ...nextComments[targetIndex],
        text: commentText,
        images: commentImages,
        updatedAt: Date.now(),
      };

      const nextCard: Card = {
        ...card,
        comments: normalizeComments(nextComments),
      };

      return {
        ...state,
        cardsById: { ...state.cardsById, [card.id]: nextCard },
      };
    }

    case 'CARD_COMMENT_DELETE': {
      const card = state.cardsById[action.cardId];
      if (!card) return state;

      const commentId = String(action.commentId ?? '').trim();
      if (!commentId) return state;

      const comments = normalizeComments((card as { comments?: unknown }).comments);
      const targetIndex = comments.findIndex((comment) => comment.id === commentId);
      if (targetIndex < 0) return state;

      const nextComments = comments.filter((comment) => comment.id !== commentId);
      const nextCard: Card = {
        ...card,
        comments: nextComments,
      };

      return {
        ...state,
        cardsById: { ...state.cardsById, [card.id]: nextCard },
      };
    }

    case 'CARD_MOVE': {
      const card = state.cardsById[action.cardId];
      if (!card) return state;

      const from = findCardPosition(action.cardId, state.columns);
      if (!from) return state;

      const fromCol = from.col;
      const toCol = action.toCol;

      let nextColumns = state.columns;
      if (fromCol === toCol) {
        const fromArr = state.columns[fromCol];
        const safeTo = Math.min(Math.max(action.toIndex, 0), fromArr.length - 1);
        if (safeTo === from.index) return state;

        nextColumns = {
          ...state.columns,
          [fromCol]: moveWithin(fromArr, from.index, safeTo),
        };
      } else {
        const fromArr = state.columns[fromCol];
        const toArr = state.columns[toCol];

        nextColumns = {
          ...state.columns,
          [fromCol]: removeAt(fromArr, from.index),
          [toCol]: insertAt(toArr, action.toIndex, action.cardId),
        };
      }

      let nextCards = state.cardsById;
      let doingDeltaMs = 0;

      if (fromCol !== toCol) {
        const [updated, delta] = applyDoingTransition(card, fromCol, toCol, action.now);
        doingDeltaMs = delta;
        if (updated !== card) nextCards = { ...state.cardsById, [card.id]: updated };
      }

      const movedCard = nextCards[action.cardId] ?? card;
      const movedWithStatus = withCardStatus(movedCard, toCol);
      if (movedWithStatus !== movedCard) {
        nextCards = { ...nextCards, [action.cardId]: movedWithStatus };
      }

      let nextHistory = state.history;
      if (fromCol !== toCol) {
        const title = card.title || 'Без названия';
        const entry: HistoryEntry = {
          id: action.historyId,
          at: action.now,
          text: historyMoveText(title, fromCol, toCol, doingDeltaMs),
          cardId: card.id,
          kind: 'move',
          meta: {
            title: card.title.trim(),
            fromCol,
            toCol,
            doingDeltaMs,
          },
        };
        nextHistory = addHistory(state.history, entry);
      }

      return {
        ...state,
        columns: nextColumns,
        cardsById: nextCards,
        floatingById: removeFromFloating(state.floatingById, action.cardId),
        history: nextHistory,
      };
    }

    case 'CARD_FLOAT': {
      const card = state.cardsById[action.cardId];
      if (!card) return state;

      const from = findCardPosition(action.cardId, state.columns);
      const fromCol = from?.col ?? null;

      const basePin = state.floatingById[action.cardId] ?? fallbackPinForIndex(Object.keys(state.floatingById).length);
      const nextPin = normalizePin(
        { x: action.x, y: action.y, swayOffsetMs: action.swayOffsetMs ?? basePin.swayOffsetMs },
        basePin
      );

      let nextFloating = state.floatingById;
      const prevPin = state.floatingById[action.cardId];
      if (
        !prevPin ||
        prevPin.x !== nextPin.x ||
        prevPin.y !== nextPin.y ||
        prevPin.swayOffsetMs !== nextPin.swayOffsetMs
      ) {
        nextFloating = { ...state.floatingById, [action.cardId]: nextPin };
      }

      let nextColumns = state.columns;
      if (from) {
        nextColumns = {
          ...state.columns,
          [from.col]: removeAt(state.columns[from.col], from.index),
        };
      }

      let nextCard = card;
      if (fromCol === 'doing' && card.doingStartedAt != null) {
        const doingDeltaMs = Math.max(0, action.now - card.doingStartedAt);
        nextCard = {
          ...card,
          doingTotalMs: card.doingTotalMs + doingDeltaMs,
          doingStartedAt: null,
        };
      } else if (card.doingStartedAt != null) {
        nextCard = { ...card, doingStartedAt: null };
      }

      nextCard = withCardStatus(nextCard, 'freedom');
      const nextCards = nextCard === card ? state.cardsById : { ...state.cardsById, [card.id]: nextCard };

      if (nextFloating === state.floatingById && nextColumns === state.columns && nextCards === state.cardsById) {
        return state;
      }

      return {
        ...state,
        columns: nextColumns,
        cardsById: nextCards,
        floatingById: nextFloating,
      };
    }

    case 'CARD_DOCK': {
      const card = state.cardsById[action.cardId];
      if (!card) return state;

      const toCol = action.toCol;
      const from = findCardPosition(action.cardId, state.columns);

      const strippedColumns = removeFromAllColumns(state.columns, action.cardId);
      const nextColumns: BoardState['columns'] = {
        ...strippedColumns,
        [toCol]: insertAt(strippedColumns[toCol], action.toIndex, action.cardId),
      };

      let nextCard = card;
      let doingDeltaMs = 0;

      if (from) {
        const [updated, delta] = applyDoingTransition(card, from.col, toCol, action.now);
        nextCard = updated;
        doingDeltaMs = delta;
      } else if (toCol === 'doing') {
        nextCard = card.doingStartedAt == null ? { ...card, doingStartedAt: action.now } : card;
      } else if (card.doingStartedAt != null) {
        nextCard = { ...card, doingStartedAt: null };
      }

      nextCard = withCardStatus(nextCard, toCol);
      const nextCards = nextCard === card ? state.cardsById : { ...state.cardsById, [action.cardId]: nextCard };

      let nextHistory = state.history;
      if (from && from.col !== toCol) {
        const title = card.title || 'Без названия';
        const entry: HistoryEntry = {
          id: action.historyId,
          at: action.now,
          text: historyMoveText(title, from.col, toCol, doingDeltaMs),
          cardId: card.id,
          kind: 'move',
          meta: {
            title: card.title.trim(),
            fromCol: from.col,
            toCol,
            doingDeltaMs,
          },
        };
        nextHistory = addHistory(state.history, entry);
      }

      return {
        ...state,
        columns: nextColumns,
        cardsById: nextCards,
        floatingById: removeFromFloating(state.floatingById, action.cardId),
        history: nextHistory,
      };
    }

    case 'CARD_DELETE': {
      const card = state.cardsById[action.cardId];
      if (!card) return state;

      const from = findCardPosition(action.cardId, state.columns);
      const wasFloating = Object.prototype.hasOwnProperty.call(state.floatingById, action.cardId);
      if (!from && !wasFloating) return state;
      const fromCol = from?.col ?? null;

      const [, doingDeltaMs] = from ? applyDoingTransition(card, from.col, 'queue', action.now) : [card, 0];

      const nextCards = { ...state.cardsById };
      delete nextCards[action.cardId];

      const nextColumns: BoardState['columns'] = from
        ? {
            ...state.columns,
            [from.col]: removeAt(state.columns[from.col], from.index),
          }
        : state.columns;

      const title = card.title || 'Без названия';
      const entry: HistoryEntry = {
        id: action.historyId,
        at: action.now,
        text: historyDeleteText(title, fromCol ?? 'queue', doingDeltaMs),
        cardId: null,
        kind: 'delete',
        meta: {
          title: card.title.trim(),
          fromCol,
          toCol: null,
          doingDeltaMs,
        },
      };

      return {
        ...state,
        cardsById: nextCards,
        columns: nextColumns,
        floatingById: removeFromFloating(state.floatingById, action.cardId),
        history: addHistory(state.history, entry),
      };
    }

    case 'UNDO_RESTORE': {
      const { card, col, index } = action.payload;

      const restored: Card =
        col === 'doing'
          ? { ...card, status: col, doingStartedAt: action.now }
          : { ...card, status: col, doingStartedAt: null };

      const nextCards = { ...state.cardsById, [restored.id]: restored };

      const stripped = removeFromAllColumns(state.columns, restored.id);
      const nextDest = insertAt(stripped[col], index, restored.id);
      const nextColumns: BoardState['columns'] = { ...stripped, [col]: nextDest };

      const title = restored.title || 'Без названия';
      const entry: HistoryEntry = {
        id: action.historyId,
        at: action.now,
        text: historyRestoreText(title, col),
        cardId: restored.id,
        kind: 'restore',
        meta: {
          title: restored.title.trim(),
          fromCol: null,
          toCol: col,
          doingDeltaMs: 0,
        },
      };

      return {
        ...state,
        cardsById: nextCards,
        columns: nextColumns,
        floatingById: removeFromFloating(state.floatingById, restored.id),
        history: addHistory(state.history, entry),
      };
    }

    case 'HISTORY_CLEAR':
      return { ...state, history: [] };

    default:
      return state;
  }
}
