import { ApiError, getAuthToken, getRemoteBoardVersion, saveRemoteBoard } from '../auth/api';
import type { BoardState, Card, CardStatus } from './types';
import { sanitizeCardImages } from './cardImages';

export type { BoardState } from './types';

const STORAGE_KEYS = [
  'todo-board-state-v1',
  'todo-board-state',
  'todo-board',
  'kanban-board-state',
  'kanban',
  'boardState',
] as const;

let pendingRemotePayload: { state: BoardState; snapshot: string } | null = null;
let remoteFlushTask: Promise<void> | null = null;
let lastRemoteSnapshot: string | null = null;
const MAX_COMMENTS_PER_CARD = 200;
const MAX_COMMENT_TEXT_LEN = 4000;
const MAX_CHECKLIST_ITEMS_PER_CARD = 120;
const MAX_CHECKLIST_ITEM_TEXT_LEN = 220;

function defaultState(): BoardState {
  return {
    cardsById: {},
    columns: {
      queue: [],
      doing: [],
      review: [],
      done: [],
    },
    floatingById: {},
    history: [],
  };
}

function fallbackFloatingPin(index: number) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: 24 + col * 268,
    y: 124 + row * 146,
    swayOffsetMs: (index * 187) % 2400,
  };
}

function deriveCardStatus(
  cardId: string,
  columns: BoardState['columns'],
  floatingById: BoardState['floatingById']
): CardStatus {
  if (columns.queue.includes(cardId)) return 'queue';
  if (columns.doing.includes(cardId)) return 'doing';
  if (columns.review.includes(cardId)) return 'review';
  if (columns.done.includes(cardId)) return 'done';
  if (Object.prototype.hasOwnProperty.call(floatingById, cardId)) return 'freedom';
  return 'queue';
}

function syncCardStatuses(
  cardsById: BoardState['cardsById'],
  columns: BoardState['columns'],
  floatingById: BoardState['floatingById']
): BoardState['cardsById'] {
  const next: BoardState['cardsById'] = {};
  for (const [id, card] of Object.entries(cardsById)) {
    const status = deriveCardStatus(id, columns, floatingById);
    next[id] = card.status === status ? card : { ...card, status };
  }
  return next;
}

function normalizeComments(raw: unknown): Card['comments'] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: Card['comments'] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;

    const id = String((item as { id?: unknown }).id ?? '').trim();
    const text = String((item as { text?: unknown }).text ?? '').trim();
    const images = sanitizeCardImages((item as { images?: unknown }).images);
    const createdAtRaw = Number((item as { createdAt?: unknown }).createdAt);
    const authorRaw = String((item as { author?: unknown }).author ?? '').trim();
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
      author: authorRaw ? authorRaw.slice(0, 64) : null,
    });
    if (out.length >= MAX_COMMENTS_PER_CARD) break;
  }

  out.sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.id.localeCompare(b.id);
  });
  return out;
}

function normalizeCardCreator(raw: unknown): string | null {
  const createdBy = String(raw ?? '').trim();
  return createdBy ? createdBy.slice(0, 64) : null;
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
    if (!id || !text || seen.has(id)) continue;

    seen.add(id);
    out.push({
      id,
      text,
      done: (item as { done?: unknown }).done === true,
      createdAt: Number.isFinite(createdAtRaw) ? Math.max(0, Math.trunc(createdAtRaw)) : Date.now(),
    });
    if (out.length >= MAX_CHECKLIST_ITEMS_PER_CARD) break;
  }

  out.sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.id.localeCompare(b.id);
  });
  return out;
}

function normalizeState(state: BoardState): BoardState {
  const now = Date.now();
  const seenCardIds = new Set<string>();

  const normalizeColumn = (ids: unknown) => {
    if (!Array.isArray(ids)) return [];

    const normalized: string[] = [];
    for (const rawId of ids) {
      if (typeof rawId !== 'string') continue;
      if (!state.cardsById?.[rawId]) continue;
      if (seenCardIds.has(rawId)) continue;

      seenCardIds.add(rawId);
      normalized.push(rawId);
    }

    return normalized;
  };

  const columns: BoardState['columns'] = {
    queue: normalizeColumn(state.columns?.queue),
    doing: normalizeColumn(state.columns?.doing),
    review: normalizeColumn(state.columns?.review),
    done: normalizeColumn(state.columns?.done),
  };

  const doingSet = new Set(columns.doing);
  const cardsById: BoardState['cardsById'] = {};
  const src = state.cardsById ?? {};

  for (const [id, raw] of Object.entries(src)) {
    const card = raw as Card;
    const inDoing = doingSet.has(id);
    const doingTotalMs = Number((card as { doingTotalMs?: unknown }).doingTotalMs ?? 0) || 0;
    const rawStatus = String((card as { status?: unknown }).status ?? '').trim().toLowerCase();
    const status: CardStatus =
      rawStatus === 'queue' || rawStatus === 'doing' || rawStatus === 'review' || rawStatus === 'done' || rawStatus === 'freedom'
        ? rawStatus
        : inDoing
          ? 'doing'
          : 'queue';

    let doingStartedAt: number | null =
      (card as { doingStartedAt?: unknown }).doingStartedAt == null
        ? null
        : Number((card as { doingStartedAt?: unknown }).doingStartedAt);

    if (inDoing) {
      if (doingStartedAt == null || Number.isNaN(doingStartedAt)) doingStartedAt = now;
    } else {
      doingStartedAt = null;
    }

    cardsById[id] = {
      ...card,
      status,
      isFavorite: Boolean((card as { isFavorite?: unknown }).isFavorite),
      createdBy: normalizeCardCreator((card as { createdBy?: unknown }).createdBy),
      comments: normalizeComments((card as { comments?: unknown }).comments),
      images: sanitizeCardImages((card as { images?: unknown }).images),
      checklist: normalizeChecklist((card as { checklist?: unknown }).checklist),
      doingTotalMs,
      doingStartedAt,
    };
  }

  const normalized: BoardState = {
    ...state,
    columns,
    cardsById,
    floatingById: {},
    history: Array.isArray(state.history) ? state.history : [],
  };

  const rawFloating = state.floatingById;
  if (rawFloating && typeof rawFloating === 'object') {
    const nextFloating: BoardState['floatingById'] = {};

    for (const [rawId, rawPos] of Object.entries(rawFloating)) {
      if (!rawPos || typeof rawPos !== 'object') continue;
      const id = String(rawId ?? '').trim();
      if (!id || !cardsById[id] || seenCardIds.has(id)) continue;

      const x = Number((rawPos as { x?: unknown }).x);
      const y = Number((rawPos as { y?: unknown }).y);
      const swayOffsetMs = Number((rawPos as { swayOffsetMs?: unknown }).swayOffsetMs);

      nextFloating[id] = {
        x: Number.isFinite(x) ? Math.round(x) : 24,
        y: Number.isFinite(y) ? Math.round(y) : 120,
        swayOffsetMs: Number.isFinite(swayOffsetMs) && swayOffsetMs >= 0 ? Math.round(swayOffsetMs) : 0,
      };
    }

    normalized.floatingById = nextFloating;
  }

  const floatingIds = new Set(Object.keys(normalized.floatingById));
  let orphanCounter = floatingIds.size;
  for (const id of Object.keys(cardsById)) {
    if (seenCardIds.has(id)) continue;
    if (floatingIds.has(id)) continue;
    normalized.floatingById[id] = fallbackFloatingPin(orphanCounter);
    floatingIds.add(id);
    orphanCounter += 1;
  }

  normalized.cardsById = syncCardStatuses(normalized.cardsById, normalized.columns, normalized.floatingById);

  return migrateCardIdsToSequence(normalized);
}

function migrateCardIdsToSequence(state: BoardState): BoardState {
  const ids = Object.keys(state.cardsById);
  if (ids.length === 0) return state;

  const allSequential = ids.every((id) => /^P-\d+$/i.test(id));
  if (allSequential) return state;

  const ordered = Object.values(state.cardsById)
    .slice()
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
      return a.id.localeCompare(b.id);
    });

  const idMap = new Map<string, string>();
  for (let i = 0; i < ordered.length; i += 1) {
    idMap.set(ordered[i].id, `P-${i + 1}`);
  }

  const nextCardsById: BoardState['cardsById'] = {};
  for (const card of ordered) {
    const nextId = idMap.get(card.id);
    if (!nextId) continue;
    nextCardsById[nextId] = { ...card, id: nextId };
  }

  const remapColumn = (col: string[]) =>
    col.map((id) => idMap.get(id)).filter((id): id is string => Boolean(id));

  const nextColumns: BoardState['columns'] = {
    queue: remapColumn(state.columns.queue),
    doing: remapColumn(state.columns.doing),
    review: remapColumn(state.columns.review),
    done: remapColumn(state.columns.done),
  };

  const nextFloatingById: BoardState['floatingById'] = {};
  for (const [id, pin] of Object.entries(state.floatingById ?? {})) {
    const nextId = idMap.get(id);
    if (!nextId) continue;
    nextFloatingById[nextId] = pin;
  }

  const nextHistory = (state.history ?? []).map((entry) => {
    if (!entry.cardId) return entry;
    return { ...entry, cardId: idMap.get(entry.cardId) ?? entry.cardId };
  });

  return {
    ...state,
    cardsById: syncCardStatuses(nextCardsById, nextColumns, nextFloatingById),
    columns: nextColumns,
    floatingById: nextFloatingById,
    history: nextHistory,
  };
}

function saveStateLocalOnly(state: BoardState): void {
  try {
    localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(state));
  } catch {
    // ignore
  }
}

function createStateSnapshot(state: BoardState): string {
  return JSON.stringify(state);
}

function queueRemoteSave(state: BoardState): void {
  if (!getAuthToken()) return;
  const snapshot = createStateSnapshot(state);
  if (snapshot === lastRemoteSnapshot) return;

  pendingRemotePayload = { state, snapshot };
  if (remoteFlushTask) return;

  remoteFlushTask = (async () => {
    while (pendingRemotePayload) {
      const nextPayload = pendingRemotePayload;
      pendingRemotePayload = null;
      if (nextPayload.snapshot === lastRemoteSnapshot) continue;

      try {
        await saveRemoteBoard(nextPayload.state, { baseVersion: getRemoteBoardVersion() });
        lastRemoteSnapshot = nextPayload.snapshot;
      } catch (error) {
        if (error instanceof ApiError && error.code === 'BOARD_VERSION_CONFLICT') {
          await saveRemoteBoard(nextPayload.state);
          lastRemoteSnapshot = nextPayload.snapshot;
          continue;
        }
        if (!pendingRemotePayload) pendingRemotePayload = nextPayload;
        break;
      }
    }
  })().finally(() => {
    remoteFlushTask = null;
  });
}

export function loadState(): BoardState {
  try {
    for (const key of STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as BoardState;
      if (!parsed || typeof parsed !== 'object') continue;

      return normalizeState(parsed);
    }
  } catch {
    // ignore
  }

  return defaultState();
}

export function hydrateLocalState(state: BoardState): void {
  pendingRemotePayload = null;
  const normalized = normalizeState(state);
  saveStateLocalOnly(normalized);
  markStateAsRemoteSynced(normalized);
}

export function clearLocalState(): void {
  pendingRemotePayload = null;
  lastRemoteSnapshot = null;
  try {
    for (const key of STORAGE_KEYS) localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function markStateAsRemoteSynced(state: BoardState): void {
  const normalized = normalizeState(state);
  lastRemoteSnapshot = createStateSnapshot(normalized);
}

export function saveState(state: BoardState): void {
  const normalized = normalizeState(state);
  saveStateLocalOnly(normalized);
  queueRemoteSave(normalized);
}
