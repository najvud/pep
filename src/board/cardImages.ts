import type { CardImage } from './types';
import { ApiError, getAuthToken, uploadRemoteImage } from '../auth/api';

export const MAX_CARD_IMAGES = 8;
export const MAX_CARD_IMAGE_BYTES = 900 * 1024;
export const MAX_CARD_IMAGES_TOTAL_BYTES = 3 * 1024 * 1024;

const MAX_IMAGE_NAME_LEN = 128;
const PREVIEW_MAX_SIDE = 360;
const PREVIEW_JPEG_QUALITY = 0.82;

const ALLOWED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

const DATA_URL_RX = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i;
const MEDIA_URL_PARSE_RX = /^(?:https?:\/\/[^/]+)?\/api\/media\/([a-z0-9][a-z0-9._-]*)(?:\?.*)?$/i;

function normalizeMediaUrl(raw: string): { url: string; fileName: string } | null {
  const match = MEDIA_URL_PARSE_RX.exec(raw.trim());
  if (!match) return null;
  const fileName = String(match[1] ?? '').trim();
  if (!fileName) return null;
  return {
    url: `/api/media/${fileName}`,
    fileName,
  };
}

function normalizeId(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .slice(0, 128);
}

function makeImageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `img_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function normalizeMime(raw: unknown): string | null {
  const mime = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!mime) return null;
  if (mime === 'image/jpg') return 'image/jpeg';
  return ALLOWED_IMAGE_MIME.has(mime) ? mime : null;
}

function mimeFromFileName(raw: unknown): string | null {
  const name = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  return null;
}

function extFromMime(mime: string): string {
  if (mime === 'image/png') return '.png';
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  return '.img';
}

function normalizeName(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .slice(0, MAX_IMAGE_NAME_LEN);
}

function buildPreviewName(raw: string, mime: string): string {
  const base = normalizeName(raw).replace(/\.[a-z0-9]+$/i, '') || 'image';
  return normalizeName(`${base}-preview${extFromMime(mime)}`);
}

function base64Bytes(base64Payload: string): number {
  const clean = base64Payload.replace(/\s+/g, '');
  if (!clean) return 0;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function base64PayloadFromDataUrl(value: string): { mime: string; payload: string } | null {
  const match = DATA_URL_RX.exec(String(value ?? '').trim());
  if (!match) return null;
  const mime = normalizeMime(match[1]);
  if (!mime) return null;
  const payload = String(match[2] ?? '').trim();
  if (!payload) return null;
  return { mime, payload };
}

function normalizePreviewImage(raw: unknown): {
  previewUrl: string;
  previewMime: string;
  previewSize: number;
  previewFileId: string | null;
} | null {
  if (!raw || typeof raw !== 'object') return null;

  const previewRaw = String((raw as { previewUrl?: unknown }).previewUrl ?? '').trim();
  if (!previewRaw) return null;

  const previewMatch = DATA_URL_RX.exec(previewRaw);
  const previewMedia = previewMatch ? null : normalizeMediaUrl(previewRaw);
  if (!previewMatch && !previewMedia) return null;

  const previewMime = previewMatch
    ? normalizeMime(previewMatch[1])
    : normalizeMime((raw as { previewMime?: unknown }).previewMime) ??
      mimeFromFileName((raw as { name?: unknown }).name) ??
      mimeFromFileName(previewMedia?.fileName);
  if (!previewMime) return null;

  const approxSize = previewMatch ? base64Bytes(previewMatch[2]) : 1;
  if (!Number.isFinite(approxSize) || approxSize <= 0 || approxSize > MAX_CARD_IMAGE_BYTES) return null;

  const previewSizeRaw = Number((raw as { previewSize?: unknown }).previewSize);
  const previewSize = Number.isFinite(previewSizeRaw) && previewSizeRaw > 0 ? Math.trunc(previewSizeRaw) : approxSize;
  if (!Number.isFinite(previewSize) || previewSize <= 0 || previewSize > MAX_CARD_IMAGE_BYTES) return null;

  const previewFileId = normalizeId((raw as { previewFileId?: unknown }).previewFileId) || previewMedia?.fileName || null;

  return {
    previewUrl: previewMatch ? `data:${previewMime};base64,${previewMatch[2]}` : (previewMedia ? previewMedia.url : previewRaw),
    previewMime,
    previewSize,
    previewFileId,
  };
}

function sanitizeSingleImage(raw: unknown): CardImage | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = normalizeId((raw as { id?: unknown }).id);
  const createdAtRaw = Number((raw as { createdAt?: unknown }).createdAt);
  const name = normalizeName((raw as { name?: unknown }).name);
  const dataUrlRaw = String((raw as { dataUrl?: unknown }).dataUrl ?? '').trim();
  if (!id || !dataUrlRaw) return null;

  const match = DATA_URL_RX.exec(dataUrlRaw);
  const mediaUrl = match ? null : normalizeMediaUrl(dataUrlRaw);
  if (!match && !mediaUrl) return null;

  const mime = match
    ? normalizeMime(match[1])
    : normalizeMime((raw as { mime?: unknown }).mime) ?? mimeFromFileName(name) ?? mimeFromFileName(mediaUrl?.fileName);
  if (!mime) return null;

  const approxSize = match ? base64Bytes(match[2]) : 1;
  if (!Number.isFinite(approxSize) || approxSize <= 0 || approxSize > MAX_CARD_IMAGE_BYTES) return null;

  const sizeRaw = Number((raw as { size?: unknown }).size);
  const size = Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.trunc(sizeRaw) : approxSize;
  if (size <= 0 || size > MAX_CARD_IMAGE_BYTES) return null;

  const fileId = normalizeId((raw as { fileId?: unknown }).fileId) || mediaUrl?.fileName || null;
  const preview = normalizePreviewImage(raw);

  return {
    id,
    fileId,
    dataUrl: match ? `data:${mime};base64,${match[2]}` : (mediaUrl ? mediaUrl.url : dataUrlRaw),
    mime,
    size,
    name,
    createdAt: Number.isFinite(createdAtRaw) ? Math.max(0, Math.trunc(createdAtRaw)) : Date.now(),
    ...(preview
      ? {
          previewFileId: preview.previewFileId,
          previewUrl: preview.previewUrl,
          previewMime: preview.previewMime,
          previewSize: preview.previewSize,
        }
      : {}),
  };
}

export function getCardImagePreviewUrl(image: CardImage): string {
  const previewRaw = String(image?.previewUrl ?? '').trim();
  if (previewRaw) {
    if (DATA_URL_RX.test(previewRaw)) return previewRaw;
    const media = normalizeMediaUrl(previewRaw);
    if (media) return media.url;
  }
  return String(image?.dataUrl ?? '').trim();
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(file);
  });
}

async function createPreviewFromDataUrl(
  dataUrl: string,
  mime: string,
  name: string,
  originalBytes: number
): Promise<{ dataUrl: string; mime: string; size: number; name: string } | null> {
  if (typeof document === 'undefined') return null;
  if (!dataUrl.startsWith('data:image/')) return null;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const node = new Image();
    node.decoding = 'async';
    node.onload = () => resolve(node);
    node.onerror = () => reject(new Error('IMG_LOAD_FAILED'));
    node.src = dataUrl;
  }).catch(() => null);
  if (!img) return null;

  const width = Number(img.naturalWidth || 0);
  const height = Number(img.naturalHeight || 0);
  if (width <= 0 || height <= 0) return null;

  const maxSide = Math.max(width, height);
  if (maxSide <= PREVIEW_MAX_SIDE) return null;

  const scale = PREVIEW_MAX_SIDE / maxSide;
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const outputMime = mime === 'image/png' ? 'image/png' : 'image/jpeg';
  const previewDataUrl =
    outputMime === 'image/jpeg'
      ? canvas.toDataURL(outputMime, PREVIEW_JPEG_QUALITY)
      : canvas.toDataURL(outputMime);
  const payload = base64PayloadFromDataUrl(previewDataUrl);
  if (!payload) return null;
  const previewSize = base64Bytes(payload.payload);
  if (!Number.isFinite(previewSize) || previewSize <= 0 || previewSize > MAX_CARD_IMAGE_BYTES) return null;
  if (previewSize >= originalBytes) return null;

  return {
    dataUrl: previewDataUrl,
    mime: payload.mime,
    size: previewSize,
    name: buildPreviewName(name, payload.mime),
  };
}

type UploadCandidate = {
  dataUrl: string;
  mime: string;
  name: string;
  size: number;
};

type UploadAttemptResult = {
  image: CardImage | null;
  quotaExceeded: boolean;
  rateLimited: boolean;
};

async function tryUploadImage(candidate: UploadCandidate, token: string | null): Promise<UploadAttemptResult> {
  if (!token) return { image: null, quotaExceeded: false, rateLimited: false };

  const parsed = base64PayloadFromDataUrl(candidate.dataUrl);
  if (!parsed) return { image: null, quotaExceeded: false, rateLimited: false };

  try {
    const uploaded = await uploadRemoteImage(
      {
        mime: parsed.mime || candidate.mime,
        dataBase64: parsed.payload,
        name: normalizeName(candidate.name),
        size: Number.isFinite(candidate.size) ? Math.max(1, Math.trunc(candidate.size)) : undefined,
      },
      token
    );
    return { image: sanitizeSingleImage(uploaded), quotaExceeded: false, rateLimited: false };
  } catch (err) {
    const quotaExceeded = err instanceof ApiError && err.code === 'MEDIA_QUOTA_EXCEEDED';
    const rateLimited = err instanceof ApiError && err.code === 'RATE_LIMITED';
    return { image: null, quotaExceeded, rateLimited };
  }
}

export function sanitizeCardImages(raw: unknown): CardImage[] {
  if (!Array.isArray(raw)) return [];

  const out: CardImage[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;

  for (const entry of raw) {
    const image = sanitizeSingleImage(entry);
    if (!image) continue;
    if (seen.has(image.id)) continue;
    if (out.length >= MAX_CARD_IMAGES) break;
    if (totalBytes + image.size > MAX_CARD_IMAGES_TOTAL_BYTES) break;

    seen.add(image.id);
    totalBytes += image.size;
    out.push(image);
  }

  out.sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.id.localeCompare(b.id);
  });

  return out;
}

export async function loadCardImagesFromFiles(
  files: FileList | File[] | null,
  existing: CardImage[]
): Promise<{ images: CardImage[]; rejected: string[]; quotaExceeded: boolean; rateLimited: boolean }> {
  const accepted: CardImage[] = [];
  const rejected: string[] = [];
  let quotaExceeded = false;
  let rateLimited = false;
  const base = sanitizeCardImages(existing);
  const token = getAuthToken();

  const input = files ? Array.from(files as ArrayLike<File>) : [];
  if (input.length === 0) return { images: [], rejected: [], quotaExceeded: false, rateLimited: false };

  let totalBytes = base.reduce((sum, image) => sum + image.size, 0);
  let slotsLeft = Math.max(0, MAX_CARD_IMAGES - base.length);

  for (const file of input) {
    if (slotsLeft <= 0) {
      rejected.push(file.name || 'file');
      continue;
    }

    const mime = normalizeMime(file.type) ?? mimeFromFileName(file.name);
    if (!mime || !ALLOWED_IMAGE_MIME.has(mime)) {
      rejected.push(file.name || 'file');
      continue;
    }

    const bytes = Number.isFinite(file.size) ? Math.trunc(file.size) : 0;
    if (bytes <= 0 || bytes > MAX_CARD_IMAGE_BYTES) {
      rejected.push(file.name || 'file');
      continue;
    }
    if (totalBytes + bytes > MAX_CARD_IMAGES_TOTAL_BYTES) {
      rejected.push(file.name || 'file');
      continue;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const previewCandidate = token
        ? await createPreviewFromDataUrl(dataUrl, mime, file.name, bytes)
        : null;

      const uploaded = await tryUploadImage(
        { dataUrl, mime, name: normalizeName(file.name), size: bytes },
        token
      );
      const uploadedPreview = previewCandidate
        ? await tryUploadImage(previewCandidate, token)
        : { image: null, quotaExceeded: false, rateLimited: false };

      if (uploaded.quotaExceeded || uploadedPreview.quotaExceeded) {
        quotaExceeded = true;
      }
      if (uploaded.rateLimited || uploadedPreview.rateLimited) {
        rateLimited = true;
      }

      if (token && !uploaded.image) {
        rejected.push(file.name || 'file');
        continue;
      }

      const image = sanitizeSingleImage(
        uploaded.image
          ? {
              ...uploaded.image,
              previewFileId: uploadedPreview.image?.fileId ?? null,
              previewUrl: uploadedPreview.image?.dataUrl,
              previewMime: uploadedPreview.image?.mime,
              previewSize: uploadedPreview.image?.size,
            }
          : {
              id: makeImageId(),
              dataUrl,
              mime,
              size: bytes,
              name: normalizeName(file.name),
              createdAt: Date.now(),
            }
      );

      if (!image) {
        rejected.push(file.name || 'file');
        continue;
      }

      accepted.push(image);
      totalBytes += image.size;
      slotsLeft -= 1;
    } catch {
      rejected.push(file.name || 'file');
    }
  }

  return { images: accepted, rejected, quotaExceeded, rateLimited };
}
