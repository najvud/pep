import type { BoardState, CardChecklistItem, CardComment, CardImage } from '../board/types';

const API_BASE = '/api';
const TOKEN_STORAGE_KEY = 'todo-board-auth-token';
let remoteBoardVersion: number | null = null;
let remoteBoardEtag: string | null = null;
const ARCHIVED_COMMENTS_CACHE_TTL_MS = 12_000;
const ARCHIVED_COMMENTS_CACHE_STALE_TTL_MS = 75_000;
const ARCHIVED_COMMENTS_CACHE_MAX_ENTRIES = 400;
const COMMENTS_CACHE_TTL_MS = 8_000;
const COMMENTS_CACHE_STALE_TTL_MS = 45_000;
const COMMENTS_CACHE_MAX_ENTRIES = 500;

export type AuthUser = {
  id: string;
  login: string;
  email: string;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  role: string | null;
  city: string | null;
  about: string | null;
};

export type ProfileUpdatePayload = {
  login?: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  role?: string | null;
  city?: string | null;
  about?: string | null;
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function parseJsonSafe(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeApiError(status: number, payload: unknown): ApiError {
  if (payload && typeof payload === 'object') {
    const message = typeof (payload as { message?: unknown }).message === 'string'
      ? (payload as { message: string }).message
      : typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `HTTP ${status}`;

    const code = typeof (payload as { error?: unknown }).error === 'string'
      ? (payload as { error: string }).error
      : 'API_ERROR';

    return new ApiError(message, status, code);
  }

  return new ApiError(`HTTP ${status}`, status, 'API_ERROR');
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  token: string | null = getAuthToken()
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await response.text();
  const payload = parseJsonSafe(text);

  if (!response.ok) throw normalizeApiError(response.status, payload);

  return payload as T;
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (!token) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      remoteBoardVersion = null;
      remoteBoardEtag = null;
      clearArchivedCommentsCache();
      clearCommentsCache();
    } else {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      remoteBoardVersion = null;
      remoteBoardEtag = null;
      clearArchivedCommentsCache();
      clearCommentsCache();
    }
  } catch {
    // ignore storage failures
  }
}

function normalizeBoardVersion(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

export function getRemoteBoardVersion(): number | null {
  return remoteBoardVersion;
}

export function setRemoteBoardVersion(version: number | null): void {
  remoteBoardVersion = normalizeBoardVersion(version);
}

type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type RemoteMediaUploadPayload = {
  mime: string;
  dataBase64: string;
  name?: string;
  size?: number;
};

type RemoteMediaUploadResponse = {
  ok: boolean;
  image: CardImage;
};

type RemoteCardMutationResponse = {
  ok: boolean;
  card?: {
    id?: string;
    isFavorite?: boolean;
  };
  updatedAt?: number;
  version?: number;
};

export async function register(login: string, email: string, password: string): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ login, email, password }),
  }, null);
}

export async function login(login: string, password: string): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  }, null);
}

export async function getMe(token: string | null = getAuthToken()): Promise<AuthUser> {
  const response = await requestJson<{ user: AuthUser }>('/auth/me', { method: 'GET' }, token);
  return response.user;
}

export async function updateProfile(
  payload: ProfileUpdatePayload,
  token: string | null = getAuthToken()
): Promise<AuthUser> {
  const response = await requestJson<{ user: AuthUser }>(
    '/auth/profile',
    {
      method: 'PATCH',
      body: JSON.stringify(payload ?? {}),
    },
    token
  );
  return response.user;
}

export async function logout(token: string | null = getAuthToken()): Promise<void> {
  await requestJson<{ ok: boolean }>('/auth/logout', { method: 'POST' }, token);
  clearArchivedCommentsCache();
  clearCommentsCache();
}

export async function loadRemoteBoard(token: string | null = getAuthToken()): Promise<BoardState | null> {
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (remoteBoardEtag) headers.set('If-None-Match', remoteBoardEtag);

  const response = await fetch(`${API_BASE}/board`, { method: 'GET', headers });
  const etag = response.headers.get('ETag');
  if (etag && etag.trim()) {
    remoteBoardEtag = etag.trim();
  } else if (response.status !== 304) {
    remoteBoardEtag = null;
  }

  if (response.status === 304) {
    return null;
  }

  const text = await response.text();
  const payload = parseJsonSafe(text);
  if (!response.ok) throw normalizeApiError(response.status, payload);

  const data = payload as { state: BoardState; version?: unknown };
  remoteBoardVersion = normalizeBoardVersion(data.version);
  return data.state;
}

type SaveRemoteBoardOptions = {
  baseVersion?: number | null;
};

export async function saveRemoteBoard(
  state: BoardState,
  optionsOrToken: SaveRemoteBoardOptions | string | null = {},
  token: string | null = getAuthToken()
): Promise<void> {
  const options: SaveRemoteBoardOptions =
    optionsOrToken && typeof optionsOrToken === 'object' ? optionsOrToken : {};
  const resolvedToken =
    typeof optionsOrToken === 'string' || optionsOrToken === null ? optionsOrToken : token;

  const resolvedBaseVersion =
    options.baseVersion == null ? null : normalizeBoardVersion(options.baseVersion);
  const payload: { state: BoardState; baseVersion?: number } = { state };
  if (resolvedBaseVersion != null) payload.baseVersion = resolvedBaseVersion;

  const response = await requestJson<{ ok: boolean; version?: number }>('/board', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, resolvedToken);
  if (Object.prototype.hasOwnProperty.call(response ?? {}, 'version')) {
    remoteBoardVersion = normalizeBoardVersion(response.version);
  }
  clearArchivedCommentsCache();
  clearCommentsCache();
}

export async function uploadRemoteImage(
  payload: RemoteMediaUploadPayload,
  token: string | null = getAuthToken()
): Promise<CardImage> {
  const response = await requestJson<RemoteMediaUploadResponse>(
    '/media/upload',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token
  );
  return response.image;
}

export async function setRemoteCardFavorite(
  cardId: string,
  isFavorite: boolean,
  token: string | null = getAuthToken()
): Promise<RemoteCardMutationResponse> {
  const response = await requestJson<RemoteCardMutationResponse>(
    `/cards/${encodeURIComponent(cardId)}`,
    {
      method: 'PATCH',
      keepalive: true,
      body: JSON.stringify({ isFavorite }),
    },
    token
  );
  if (Object.prototype.hasOwnProperty.call(response ?? {}, 'version')) {
    remoteBoardVersion = normalizeBoardVersion(response.version);
  }
  return response;
}

export async function setRemoteCardChecklist(
  cardId: string,
  checklist: CardChecklistItem[],
  token: string | null = getAuthToken()
): Promise<RemoteCardMutationResponse> {
  const response = await requestJson<RemoteCardMutationResponse>(
    `/cards/${encodeURIComponent(cardId)}`,
    {
      method: 'PATCH',
      keepalive: true,
      body: JSON.stringify({ checklist }),
    },
    token
  );
  if (Object.prototype.hasOwnProperty.call(response ?? {}, 'version')) {
    remoteBoardVersion = normalizeBoardVersion(response.version);
  }
  return response;
}

type RemoteCommentMutationResponse = {
  ok: boolean;
  cardId: string;
  comment?: CardComment;
  commentsCount: number;
  updatedAt: number;
  version?: number;
};

export type RemoteCommentsPageResponse = {
  ok: boolean;
  cardId: string;
  comments: CardComment[];
  commentsCount: number;
  version?: number;
  pagination?: {
    limit: number;
    offset: number;
    returned: number;
    hasMore: boolean;
    nextOffset: number | null;
    order: 'asc' | 'desc';
  };
};

type CommentsRequestOptions = {
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
};

type CommentsCacheEntry = {
  cachedAtMs: number;
  etag?: string | null;
  response: RemoteCommentsPageResponse;
};

const commentsCache = new Map<string, CommentsCacheEntry>();
const commentsInFlight = new Map<string, Promise<RemoteCommentsPageResponse>>();

function cloneCommentsResponse(response: RemoteCommentsPageResponse): RemoteCommentsPageResponse {
  return {
    ...response,
    comments: Array.isArray(response.comments) ? response.comments.slice() : [],
    ...(response.pagination ? { pagination: { ...response.pagination } } : {}),
  };
}

function normalizeCommentsOrder(order: CommentsRequestOptions['order']): 'asc' | 'desc' {
  return order === 'desc' ? 'desc' : 'asc';
}

function normalizeCommentsLimit(limit: unknown): number | null {
  const n = Number(limit);
  if (!Number.isFinite(n)) return null;
  const value = Math.trunc(n);
  if (value <= 0) return null;
  return value;
}

function normalizeCommentsOffset(offset: unknown): number | null {
  const n = Number(offset);
  if (!Number.isFinite(n)) return null;
  const value = Math.trunc(n);
  if (value < 0) return null;
  return value;
}

function normalizeCommentsCardId(cardId: string): string {
  return String(cardId ?? '').trim();
}

function buildCommentsCacheKey(token: string | null, cardId: string, options: CommentsRequestOptions): string {
  const normalizedCardId = normalizeCommentsCardId(cardId);
  const normalizedOrder = normalizeCommentsOrder(options.order);
  const normalizedLimit = normalizeCommentsLimit(options.limit);
  const normalizedOffset = normalizeCommentsOffset(options.offset);
  const scopeToken = String(token ?? '').trim() || 'anon';
  return [
    scopeToken,
    normalizedCardId,
    normalizedOrder,
    normalizedLimit == null ? '-' : String(normalizedLimit),
    normalizedOffset == null ? '-' : String(normalizedOffset),
  ].join('|');
}

function purgeCommentsCache(now = Date.now()): void {
  if (commentsCache.size === 0) return;
  for (const [key, entry] of commentsCache.entries()) {
    if (now - entry.cachedAtMs > COMMENTS_CACHE_STALE_TTL_MS) {
      commentsCache.delete(key);
    }
  }
  if (commentsCache.size <= COMMENTS_CACHE_MAX_ENTRIES) return;
  const entries = [...commentsCache.entries()].sort((a, b) => a[1].cachedAtMs - b[1].cachedAtMs);
  const dropCount = commentsCache.size - COMMENTS_CACHE_MAX_ENTRIES;
  for (let i = 0; i < dropCount; i += 1) {
    commentsCache.delete(entries[i][0]);
  }
}

function clearCommentsCache(): void {
  commentsCache.clear();
  commentsInFlight.clear();
}

function invalidateCommentsCacheForCard(cardId: string): void {
  const normalizedCardId = normalizeCommentsCardId(cardId);
  if (!normalizedCardId) return;
  for (const key of commentsCache.keys()) {
    const parts = key.split('|');
    if (parts.length < 2) continue;
    if (parts[1] !== normalizedCardId) continue;
    commentsCache.delete(key);
  }
  for (const key of commentsInFlight.keys()) {
    const parts = key.split('|');
    if (parts.length < 2) continue;
    if (parts[1] !== normalizedCardId) continue;
    commentsInFlight.delete(key);
  }
}

export type ArchivedCommentReason = 'overflow' | 'delete' | 'card-delete';

export type ArchivedComment = CardComment & {
  archiveId: number;
  cardId: string;
  archiveReason: ArchivedCommentReason | 'unknown';
  archivedAt: number;
};

export type RemoteArchivedCommentsPageResponse = {
  ok: boolean;
  cardId: string;
  archivedComments: ArchivedComment[];
  archivedCount: number;
  filters?: {
    reason: ArchivedCommentReason | null;
  };
  pagination?: {
    limit: number;
    offset: number;
    returned: number;
    hasMore: boolean;
    nextOffset: number | null;
    order: 'asc' | 'desc';
  };
};

type ArchivedCommentsRequestOptions = {
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  reason?: ArchivedCommentReason | 'all';
};

type ArchivedCommentsCacheEntry = {
  cachedAtMs: number;
  etag?: string | null;
  response: RemoteArchivedCommentsPageResponse;
};

const archivedCommentsCache = new Map<string, ArchivedCommentsCacheEntry>();
const archivedCommentsInFlight = new Map<string, Promise<RemoteArchivedCommentsPageResponse>>();

function cloneArchivedCommentsResponse(response: RemoteArchivedCommentsPageResponse): RemoteArchivedCommentsPageResponse {
  return {
    ...response,
    archivedComments: Array.isArray(response.archivedComments) ? response.archivedComments.slice() : [],
    ...(response.filters ? { filters: { ...response.filters } } : {}),
    ...(response.pagination ? { pagination: { ...response.pagination } } : {}),
  };
}

function normalizeArchiveReason(reason: ArchivedCommentsRequestOptions['reason']): ArchivedCommentReason | 'all' {
  return reason === 'overflow' || reason === 'delete' || reason === 'card-delete' ? reason : 'all';
}

function normalizeArchiveOrder(order: ArchivedCommentsRequestOptions['order']): 'asc' | 'desc' {
  return order === 'desc' ? 'desc' : 'asc';
}

function normalizeArchiveLimit(limit: unknown): number | null {
  const n = Number(limit);
  if (!Number.isFinite(n)) return null;
  const value = Math.trunc(n);
  if (value <= 0) return null;
  return value;
}

function normalizeArchiveOffset(offset: unknown): number | null {
  const n = Number(offset);
  if (!Number.isFinite(n)) return null;
  const value = Math.trunc(n);
  if (value < 0) return null;
  return value;
}

function normalizeArchiveCardId(cardId: string): string {
  return String(cardId ?? '').trim();
}

function buildArchivedCommentsCacheKey(token: string | null, cardId: string, options: ArchivedCommentsRequestOptions): string {
  const normalizedCardId = normalizeArchiveCardId(cardId);
  const normalizedReason = normalizeArchiveReason(options.reason);
  const normalizedOrder = normalizeArchiveOrder(options.order);
  const normalizedLimit = normalizeArchiveLimit(options.limit);
  const normalizedOffset = normalizeArchiveOffset(options.offset);
  const scopeToken = String(token ?? '').trim() || 'anon';
  return [
    scopeToken,
    normalizedCardId,
    normalizedReason,
    normalizedOrder,
    normalizedLimit == null ? '-' : String(normalizedLimit),
    normalizedOffset == null ? '-' : String(normalizedOffset),
  ].join('|');
}

function purgeArchivedCommentsCache(now = Date.now()): void {
  if (archivedCommentsCache.size === 0) return;
  for (const [key, entry] of archivedCommentsCache.entries()) {
    if (now - entry.cachedAtMs > ARCHIVED_COMMENTS_CACHE_STALE_TTL_MS) {
      archivedCommentsCache.delete(key);
    }
  }
  if (archivedCommentsCache.size <= ARCHIVED_COMMENTS_CACHE_MAX_ENTRIES) return;
  const entries = [...archivedCommentsCache.entries()].sort((a, b) => a[1].cachedAtMs - b[1].cachedAtMs);
  const dropCount = archivedCommentsCache.size - ARCHIVED_COMMENTS_CACHE_MAX_ENTRIES;
  for (let i = 0; i < dropCount; i += 1) {
    archivedCommentsCache.delete(entries[i][0]);
  }
}

function clearArchivedCommentsCache(): void {
  archivedCommentsCache.clear();
  archivedCommentsInFlight.clear();
}

function invalidateArchivedCommentsCacheForCard(cardId: string): void {
  const normalizedCardId = normalizeArchiveCardId(cardId);
  if (!normalizedCardId) return;
  for (const key of archivedCommentsCache.keys()) {
    const parts = key.split('|');
    if (parts.length < 2) continue;
    if (parts[1] !== normalizedCardId) continue;
    archivedCommentsCache.delete(key);
  }
  for (const key of archivedCommentsInFlight.keys()) {
    const parts = key.split('|');
    if (parts.length < 2) continue;
    if (parts[1] !== normalizedCardId) continue;
    archivedCommentsInFlight.delete(key);
  }
}

export async function addRemoteComment(
  cardId: string,
  text: string,
  author: string | null,
  images: CardImage[],
  token: string | null = getAuthToken()
): Promise<RemoteCommentMutationResponse> {
  const response = await requestJson<RemoteCommentMutationResponse>(
    `/cards/${encodeURIComponent(cardId)}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ text, author, images }),
    },
    token
  );
  if (Object.prototype.hasOwnProperty.call(response ?? {}, 'version')) {
    remoteBoardVersion = normalizeBoardVersion(response.version);
  }
  invalidateCommentsCacheForCard(cardId);
  invalidateArchivedCommentsCacheForCard(cardId);
  return response;
}

export async function loadRemoteComments(
  cardId: string,
  options: CommentsRequestOptions = {},
  token: string | null = getAuthToken()
): Promise<RemoteCommentsPageResponse> {
  const normalizedCardId = normalizeCommentsCardId(cardId);
  const normalizedOptions: CommentsRequestOptions = {
    limit: normalizeCommentsLimit(options.limit) ?? undefined,
    offset: normalizeCommentsOffset(options.offset) ?? undefined,
    order: normalizeCommentsOrder(options.order),
  };
  const cacheKey = buildCommentsCacheKey(token, normalizedCardId, normalizedOptions);
  const now = Date.now();
  purgeCommentsCache(now);

  const cached = commentsCache.get(cacheKey);
  if (cached && now - cached.cachedAtMs <= COMMENTS_CACHE_TTL_MS) {
    return cloneCommentsResponse(cached.response);
  }

  const inFlight = commentsInFlight.get(cacheKey);
  if (inFlight) {
    const response = await inFlight;
    return cloneCommentsResponse(response);
  }

  const requestTask = (async () => {
    const params = new URLSearchParams();
    if (Number.isFinite(Number(normalizedOptions.limit))) params.set('limit', String(Math.trunc(Number(normalizedOptions.limit))));
    if (Number.isFinite(Number(normalizedOptions.offset))) params.set('offset', String(Math.trunc(Number(normalizedOptions.offset))));
    if (normalizedOptions.order === 'asc' || normalizedOptions.order === 'desc') params.set('order', normalizedOptions.order);

    const qs = params.toString();
    const path = `/cards/${encodeURIComponent(normalizedCardId)}/comments${qs ? `?${qs}` : ''}`;
    const headers = new Headers();
    headers.set('Accept', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (cached?.etag) headers.set('If-None-Match', String(cached.etag));

    const response = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers,
    });
    const etagRaw = response.headers.get('ETag');
    const etag = etagRaw ? etagRaw.trim() || null : null;

    if (response.status === 304) {
      if (cached) {
        commentsCache.set(cacheKey, {
          cachedAtMs: Date.now(),
          etag: etag ?? cached.etag ?? null,
          response: cloneCommentsResponse(cached.response),
        });
        return cloneCommentsResponse(cached.response);
      }
      throw new ApiError('HTTP 304', 304, 'NOT_MODIFIED');
    }

    const text = await response.text();
    const payload = parseJsonSafe(text);
    if (!response.ok) {
      throw normalizeApiError(response.status, payload);
    }
    const nextResponse = payload as RemoteCommentsPageResponse;

    if (Object.prototype.hasOwnProperty.call(nextResponse ?? {}, 'version')) {
      remoteBoardVersion = normalizeBoardVersion((nextResponse as { version?: unknown }).version);
    }

    commentsCache.set(cacheKey, {
      cachedAtMs: Date.now(),
      etag,
      response: cloneCommentsResponse(nextResponse),
    });
    purgeCommentsCache(Date.now());
    return nextResponse;
  })();

  commentsInFlight.set(cacheKey, requestTask);
  try {
    const response = await requestTask;
    return cloneCommentsResponse(response);
  } finally {
    commentsInFlight.delete(cacheKey);
  }
}

export async function updateRemoteComment(
  cardId: string,
  commentId: string,
  text: string,
  images: CardImage[],
  token: string | null = getAuthToken()
): Promise<RemoteCommentMutationResponse> {
  const response = await requestJson<RemoteCommentMutationResponse>(
    `/cards/${encodeURIComponent(cardId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ text, images }),
    },
    token
  );
  if (Object.prototype.hasOwnProperty.call(response ?? {}, 'version')) {
    remoteBoardVersion = normalizeBoardVersion(response.version);
  }
  invalidateCommentsCacheForCard(cardId);
  invalidateArchivedCommentsCacheForCard(cardId);
  return response;
}

export async function deleteRemoteComment(
  cardId: string,
  commentId: string,
  token: string | null = getAuthToken()
): Promise<RemoteCommentMutationResponse> {
  const response = await requestJson<RemoteCommentMutationResponse>(
    `/cards/${encodeURIComponent(cardId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: 'DELETE',
    },
    token
  );
  if (Object.prototype.hasOwnProperty.call(response ?? {}, 'version')) {
    remoteBoardVersion = normalizeBoardVersion(response.version);
  }
  invalidateCommentsCacheForCard(cardId);
  invalidateArchivedCommentsCacheForCard(cardId);
  return response;
}

export async function loadRemoteArchivedComments(
  cardId: string,
  options: ArchivedCommentsRequestOptions = {},
  token: string | null = getAuthToken()
): Promise<RemoteArchivedCommentsPageResponse> {
  const normalizedCardId = normalizeArchiveCardId(cardId);
  const normalizedOptions: ArchivedCommentsRequestOptions = {
    limit: normalizeArchiveLimit(options.limit) ?? undefined,
    offset: normalizeArchiveOffset(options.offset) ?? undefined,
    order: normalizeArchiveOrder(options.order),
    reason: normalizeArchiveReason(options.reason),
  };
  const cacheKey = buildArchivedCommentsCacheKey(token, normalizedCardId, normalizedOptions);
  const now = Date.now();
  purgeArchivedCommentsCache(now);

  const cached = archivedCommentsCache.get(cacheKey);
  if (cached && now - cached.cachedAtMs <= ARCHIVED_COMMENTS_CACHE_TTL_MS) {
    return cloneArchivedCommentsResponse(cached.response);
  }

  const inFlight = archivedCommentsInFlight.get(cacheKey);
  if (inFlight) {
    const response = await inFlight;
    return cloneArchivedCommentsResponse(response);
  }

  const requestTask = (async () => {
    const params = new URLSearchParams();
    if (Number.isFinite(Number(normalizedOptions.limit))) params.set('limit', String(Math.trunc(Number(normalizedOptions.limit))));
    if (Number.isFinite(Number(normalizedOptions.offset))) params.set('offset', String(Math.trunc(Number(normalizedOptions.offset))));
    if (normalizedOptions.order === 'asc' || normalizedOptions.order === 'desc') params.set('order', normalizedOptions.order);
    if (
      normalizedOptions.reason &&
      (normalizedOptions.reason === 'all' ||
        normalizedOptions.reason === 'overflow' ||
        normalizedOptions.reason === 'delete' ||
        normalizedOptions.reason === 'card-delete')
    ) {
      params.set('reason', normalizedOptions.reason);
    }

    const qs = params.toString();
    const path = `/cards/${encodeURIComponent(normalizedCardId)}/comments/archive${qs ? `?${qs}` : ''}`;
    const headers = new Headers();
    headers.set('Accept', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (cached?.etag) headers.set('If-None-Match', String(cached.etag));

    const response = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers,
    });
    const etagRaw = response.headers.get('ETag');
    const etag = etagRaw ? etagRaw.trim() || null : null;

    if (response.status === 304) {
      if (cached) {
        archivedCommentsCache.set(cacheKey, {
          cachedAtMs: Date.now(),
          etag: etag ?? cached.etag ?? null,
          response: cloneArchivedCommentsResponse(cached.response),
        });
        return cloneArchivedCommentsResponse(cached.response);
      }
      throw new ApiError('HTTP 304', 304, 'NOT_MODIFIED');
    }

    const text = await response.text();
    const payload = parseJsonSafe(text);
    if (!response.ok) {
      throw normalizeApiError(response.status, payload);
    }
    const nextResponse = payload as RemoteArchivedCommentsPageResponse;

    if (Object.prototype.hasOwnProperty.call(nextResponse ?? {}, 'version')) {
      remoteBoardVersion = normalizeBoardVersion((nextResponse as { version?: unknown }).version);
    }
    archivedCommentsCache.set(cacheKey, {
      cachedAtMs: Date.now(),
      etag,
      response: cloneArchivedCommentsResponse(nextResponse),
    });
    purgeArchivedCommentsCache(Date.now());
    return nextResponse;
  })();

  archivedCommentsInFlight.set(cacheKey, requestTask);
  try {
    const response = await requestTask;
    return cloneArchivedCommentsResponse(response);
  } finally {
    archivedCommentsInFlight.delete(cacheKey);
  }
}

export async function restoreRemoteArchivedComment(
  cardId: string,
  archiveId: number,
  token: string | null = getAuthToken()
): Promise<RemoteCommentMutationResponse> {
  const response = await requestJson<RemoteCommentMutationResponse>(
    `/cards/${encodeURIComponent(cardId)}/comments/archive/${encodeURIComponent(String(Math.trunc(archiveId)))}/restore`,
    {
      method: 'POST',
    },
    token
  );
  if (Object.prototype.hasOwnProperty.call(response ?? {}, 'version')) {
    remoteBoardVersion = normalizeBoardVersion(response.version);
  }
  invalidateCommentsCacheForCard(cardId);
  invalidateArchivedCommentsCacheForCard(cardId);
  return response;
}
