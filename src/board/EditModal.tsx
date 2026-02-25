import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { UIEvent } from 'react';

import { useI18n } from '../i18n';
import { hasRichCommentContent, normalizeRichCommentHtml, renderRichCommentHtml } from './richComment';
import { MAX_CARD_IMAGES, MAX_CARD_IMAGE_BYTES, getCardImagePreviewUrl, loadCardImagesFromFiles, sanitizeCardImages } from './cardImages';
import type { Card, CardChecklistItem, CardComment, CardImage, ColumnId } from './types';
import { formatDoingDuration } from './timeFormat';
import { useMotionProfile } from './useMotionProfile';
import { BOARD_PERF } from './perfConfig';

const URGENCY_LABEL_KEY: Record<Card['urgency'], string> = {
  white: 'urgency.white',
  yellow: 'urgency.yellow',
  pink: 'urgency.pink',
  red: 'urgency.red',
};

const STATUS_COLUMN_LABEL_KEY: Record<ColumnId, string> = {
  queue: 'column.queue',
  doing: 'column.doing',
  review: 'column.review',
  done: 'column.done',
};

const STATUS_COLUMN_ORDER: ColumnId[] = ['queue', 'doing', 'review', 'done'];
const MAX_CHECKLIST_ITEMS = 120;
const MAX_CHECKLIST_ITEM_TEXT_LEN = 220;

const COMMENT_TEXT_COLORS = [
  { className: 'rc-color-0', color: '#0f172a' },
  { className: 'rc-color-1', color: '#1d4ed8' },
  { className: 'rc-color-2', color: '#0f766e' },
  { className: 'rc-color-3', color: '#b45309' },
  { className: 'rc-color-4', color: '#be123c' },
  { className: 'rc-color-5', color: '#7c3aed' },
] as const;

const COMMENT_HIGHLIGHT_COLORS = [
  { className: 'rc-bg-0', color: '#fef08a' },
  { className: 'rc-bg-1', color: '#fed7aa' },
  { className: 'rc-bg-2', color: '#bfdbfe' },
  { className: 'rc-bg-3', color: '#bbf7d0' },
  { className: 'rc-bg-4', color: '#fbcfe8' },
  { className: 'rc-bg-5', color: '#e9d5ff' },
  { className: 'rc-bg-6', color: '#ffffff' },
] as const;
const COMMENT_ARCHIVE_REASON_ORDER: Array<'all' | 'overflow' | 'delete' | 'card-delete'> = [
  'all',
  'delete',
  'card-delete',
  'overflow',
];

type CommentVirtualRow =
  | {
      kind: 'day';
      key: string;
      label: string;
    }
  | {
      kind: 'comment';
      key: string;
      comment: CardComment;
    };

function findVirtualRowIndex(offsets: number[], targetOffset: number): number {
  if (offsets.length <= 1) return 0;
  const clamped = Math.max(0, targetOffset);
  let low = 0;
  let high = offsets.length - 2;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (offsets[mid] <= clamped) low = mid;
    else high = mid - 1;
  }
  return Math.max(0, Math.min(low, offsets.length - 2));
}

function normalizeColor(value: string | null | undefined): string | null {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('"', '')
    .replaceAll("'", '');
  if (!raw) return null;

  const shortHex = /^#([0-9a-f]{3})$/.exec(raw);
  if (shortHex) {
    const [r, g, b] = shortHex[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  const fullHex = /^#([0-9a-f]{6})$/.exec(raw);
  if (fullHex) return `#${fullHex[1]}`;

  const rgb = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[,/]\s*[\d.]+\s*)?\)$/.exec(raw);
  if (!rgb) return null;

  const toHex = (part: string) => {
    const num = Math.max(0, Math.min(255, Number(part)));
    return num.toString(16).padStart(2, '0');
  };
  return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
}

function isRateLimitedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return String((error as { code?: unknown }).code ?? '').trim().toUpperCase() === 'RATE_LIMITED';
}

function sameColor(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = normalizeColor(left);
  const b = normalizeColor(right);
  if (!a || !b) return false;
  return a === b;
}

function decodeHtmlEntities(value: string): string {
  if (!value.includes('&')) return value;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function sameCardImages(left: CardImage[], right: CardImage[]): boolean {
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

function createChecklistItemId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `chk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeChecklistItems(raw: unknown): CardChecklistItem[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: CardChecklistItem[] = [];

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
    if (out.length >= MAX_CHECKLIST_ITEMS) break;
  }

  out.sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.id.localeCompare(b.id);
  });

  return out;
}

function CommentEditGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M4 19.2 4.8 15l9.8-9.8a2 2 0 0 1 2.8 0l1.8 1.8a2 2 0 0 1 0 2.8L9.4 19.6 5.2 20.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.8 6 18 10.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CommentDeleteGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M5 7h14M9.5 7V5.4c0-.8.6-1.4 1.4-1.4h2.2c.8 0 1.4.6 1.4 1.4V7M8 7l.8 12c0 .6.5 1 1.1 1h4.2c.6 0 1.1-.4 1.1-1L16 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.6 10.4v6.4M13.4 10.4v6.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CommentListGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <circle cx="5.5" cy="7" r="1.3" fill="currentColor" />
      <circle cx="5.5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="5.5" cy="17" r="1.3" fill="currentColor" />
      <path d="M9.5 7h9M9.5 12h9M9.5 17h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ImageGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <rect x="3.2" y="4.2" width="17.6" height="15.6" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="9.2" r="1.6" fill="currentColor" />
      <path d="m6.8 16.2 4.1-4.1 2.8 2.8 2.9-3 2.6 4.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FavoriteGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        d="m12 3.7 2.45 4.95 5.46.8-3.95 3.85.93 5.44L12 16.17l-4.89 2.57.93-5.44-3.95-3.85 5.46-.8L12 3.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  open: boolean;
  card: Card | null;
  cardColumn?: ColumnId | null;
  onChangeStatus?: (column: ColumnId) => Promise<void> | void;
  readOnly: boolean;
  commentAuthor?: string | null;
  onClose: () => void;
  onToggleFavorite: (cardId: string) => void;
  onChecklistChange?: (checklist: CardChecklistItem[]) => Promise<void> | void;
  onSave: (patch: { title: string; description: string; images: CardImage[] }) => void;
  onAddComment: (text: string, images: CardImage[]) => Promise<boolean> | boolean;
  onUpdateComment: (commentId: string, text: string, images: CardImage[]) => Promise<boolean> | boolean;
  onDeleteComment: (commentId: string) => Promise<boolean> | boolean;
  onLoadCommentArchive?: (
    options?: {
      limit?: number;
      offset?: number;
      order?: 'asc' | 'desc';
      reason?: 'overflow' | 'delete' | 'card-delete' | 'all';
    }
  ) => Promise<{
    archivedComments: Array<{
      archiveId: number;
      id: string;
      text: string;
      images: CardImage[];
      createdAt: number;
      updatedAt?: number;
      author: string | null;
      archiveReason: 'overflow' | 'delete' | 'card-delete' | 'unknown';
      archivedAt: number;
    }>;
    archivedCount: number;
    pagination?: {
      hasMore: boolean;
      nextOffset: number | null;
      returned: number;
    };
  } | null> | null;
  onRestoreArchivedComment?: (archiveId: number) => Promise<boolean> | boolean;
  canUseCommentArchive?: boolean;
  showDoingTimer?: boolean;
  doingMs?: number;
};

export function EditModal({
  open,
  card,
  cardColumn,
  onChangeStatus,
  readOnly,
  commentAuthor,
  onClose,
  onToggleFavorite,
  onChecklistChange,
  onSave,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onLoadCommentArchive,
  onRestoreArchivedComment,
  canUseCommentArchive,
  showDoingTimer,
  doingMs,
}: Props) {
  const { lang, locale, t } = useI18n();
  const motionProfile = useMotionProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imagesDraft, setImagesDraft] = useState<CardImage[]>([]);
  const [imagePreviewState, setImagePreviewState] = useState<{ images: CardImage[]; index: number } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [checklistDraftText, setChecklistDraftText] = useState('');
  const [checklistBusy, setChecklistBusy] = useState(false);
  const [commentDraft, setCommentDraft] = useState<{ cardId: string | null; text: string }>({
    cardId: null,
    text: '',
  });
  const [commentImagesDraft, setCommentImagesDraft] = useState<CardImage[]>([]);
  const [commentImageError, setCommentImageError] = useState<string | null>(null);
  const [commentEditDraft, setCommentEditDraft] = useState<{
    cardId: string | null;
    commentId: string | null;
    text: string;
  }>({
    cardId: null,
    commentId: null,
    text: '',
  });
  const [expandedCommentsCardId, setExpandedCommentsCardId] = useState<string | null>(null);
  const [commentDeleteConfirmId, setCommentDeleteConfirmId] = useState<string | null>(null);
  const [commentActionBusy, setCommentActionBusy] = useState(false);
  const [commentActionError, setCommentActionError] = useState<string | null>(null);
  const [commentArchiveOpen, setCommentArchiveOpen] = useState(false);
  const [commentArchiveReason, setCommentArchiveReason] = useState<'all' | 'overflow' | 'delete' | 'card-delete'>('all');
  const [commentArchiveItems, setCommentArchiveItems] = useState<
    Array<{
      archiveId: number;
      id: string;
      text: string;
      images: CardImage[];
      createdAt: number;
      updatedAt?: number;
      author: string | null;
      archiveReason: 'overflow' | 'delete' | 'card-delete' | 'unknown';
      archivedAt: number;
    }>
  >([]);
  const [commentArchiveCount, setCommentArchiveCount] = useState(0);
  const [commentArchiveOffset, setCommentArchiveOffset] = useState(0);
  const [commentArchiveHasMore, setCommentArchiveHasMore] = useState(false);
  const [commentArchiveLoading, setCommentArchiveLoading] = useState(false);
  const [commentArchiveRestoringId, setCommentArchiveRestoringId] = useState<number | null>(null);
  const [commentArchiveError, setCommentArchiveError] = useState<string | null>(null);
  const [commentArchiveNotice, setCommentArchiveNotice] = useState<string | null>(null);
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);
  const [previewImageLoadFailed, setPreviewImageLoadFailed] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [statusActionBusy, setStatusActionBusy] = useState(false);
  const [textPaletteOpen, setTextPaletteOpen] = useState(false);
  const [highlightPaletteOpen, setHighlightPaletteOpen] = useState(false);
  const [activeFormats, setActiveFormats] = useState<{
    bold: boolean;
    italic: boolean;
    strike: boolean;
    list: boolean;
    textColor: string | null;
    highlightColor: string | null;
  }>({
    bold: false,
    italic: false,
    strike: false,
    list: false,
    textColor: null,
    highlightColor: null,
  });

  const commentsScrollRef = useRef<HTMLDivElement | null>(null);
  const [commentVirtualHeights, setCommentVirtualHeights] = useState<Record<string, number>>({});
  const commentInputRef = useRef<HTMLDivElement | null>(null);
  const commentToolbarRef = useRef<HTMLDivElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const cardImageInputRef = useRef<HTMLInputElement | null>(null);
  const commentImageInputRef = useRef<HTMLInputElement | null>(null);
  const skipEditorSyncRef = useRef(false);
  const pendingTypingStyleRef = useRef<{ textColor: string | null; highlightColor: string | null }>({
    textColor: null,
    highlightColor: null,
  });
  const pendingScrollToBottomRef = useRef(false);
  const lastOpenedCardIdRef = useRef<string | null>(null);
  const mainModalRef = useRef<HTMLDivElement | null>(null);
  const freshCommentTimerRef = useRef<number | null>(null);
  const commentArchiveNoticeTimerRef = useRef<number | null>(null);
  const prevCommentsSnapshotRef = useRef<{ cardId: string | null; count: number; lastId: string | null }>({
    cardId: null,
    count: 0,
    lastId: null,
  });
  const [commentsPanelHeight, setCommentsPanelHeight] = useState<number | null>(null);
  const [freshCommentId, setFreshCommentId] = useState<string | null>(null);
  const [commentsViewportHeight, setCommentsViewportHeight] = useState(0);
  const [commentsScrollTop, setCommentsScrollTop] = useState(0);
  const commentsScrollRafRef = useRef<number | null>(null);
  const pendingCommentsScrollTopRef = useRef(0);
  const formatsRafRef = useRef<number | null>(null);

  const isShown = open && !!card;
  const inEditMode = !!card && isEditing && editingCardId === card.id;
  const comments = useMemo(() => card?.comments ?? [], [card]);
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      const aTs = Number.isFinite(a.createdAt) ? a.createdAt : 0;
      const bTs = Number.isFinite(b.createdAt) ? b.createdAt : 0;
      if (bTs !== aTs) return bTs - aTs;
      return b.id.localeCompare(a.id);
    });
  }, [comments]);
  const activeCardId = card?.id ?? null;
  const commentText = commentDraft.cardId === activeCardId ? commentDraft.text : '';
  const hasAnyComments = sortedComments.length > 0;
  const showCommentsUi = !inEditMode;
  const canShowArchive = !!canUseCommentArchive && !!onLoadCommentArchive && !!onRestoreArchivedComment;
  const canExpandComments = sortedComments.length > 120;
  const expandedComments = expandedCommentsCardId === activeCardId;
  const visibleComments = useMemo(
    () => (expandedComments ? sortedComments : sortedComments.slice(0, 120)),
    [sortedComments, expandedComments]
  );
  const hiddenCommentsCount = canExpandComments ? Math.max(0, sortedComments.length - 120) : 0;
  const activeCommentEdit = commentEditDraft.cardId === activeCardId ? commentEditDraft : null;
  const editingCommentId = activeCommentEdit?.commentId ?? null;
  const commentImages = useMemo(() => sanitizeCardImages(commentImagesDraft), [commentImagesDraft]);
  const focusedComment = useMemo(
    () => (focusedCommentId ? comments.find((comment) => comment.id === focusedCommentId) ?? null : null),
    [comments, focusedCommentId]
  );
  const focusedCommentImages = useMemo(() => sanitizeCardImages(focusedComment?.images), [focusedComment?.images]);
  const imagePreviewImages = imagePreviewState?.images ?? [];
  const imagePreviewIndex =
    imagePreviewState == null
      ? 0
      : Math.min(Math.max(Math.trunc(Number(imagePreviewState.index) || 0), 0), Math.max(0, imagePreviewImages.length - 1));
  const imagePreview = imagePreviewImages[imagePreviewIndex] ?? null;

  const openImagePreview = useCallback((images: CardImage[], index = 0) => {
    const normalized = sanitizeCardImages(images);
    if (normalized.length === 0) return;
    const safeIndex = Math.min(Math.max(Math.trunc(Number(index) || 0), 0), normalized.length - 1);
    setImagePreviewState({ images: normalized, index: safeIndex });
    setPreviewImageLoadFailed(false);
  }, []);

  const closeImagePreview = useCallback(() => {
    setImagePreviewState(null);
    setPreviewImageLoadFailed(false);
  }, []);

  const shiftImagePreview = useCallback((delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) return;
    setImagePreviewState((prev) => {
      if (!prev || !Array.isArray(prev.images) || prev.images.length === 0) return prev;
      const maxIndex = prev.images.length - 1;
      const nextIndex = Math.min(Math.max(prev.index + Math.trunc(delta), 0), maxIndex);
      if (nextIndex === prev.index) return prev;
      setPreviewImageLoadFailed(false);
      return { ...prev, index: nextIndex };
    });
  }, []);

  const stopEditing = () => {
    resetCommentComposerFormatting();
    setIsEditing(false);
    setEditingCardId(null);
    setImageError(null);
    closeImagePreview();
    setImagesDraft(sanitizeCardImages(card?.images));
  };

  const close = () => {
    stopEditing();
    onClose();
  };

  const toggleFavorite = useCallback(() => {
    if (!card) return;
    onToggleFavorite(card.id);
  }, [card, onToggleFavorite]);

  const startEditing = () => {
    if (!card || readOnly) return;
    resetCommentComposerFormatting();
    setTitle(card.title ?? '');
    setDescription(normalizeRichCommentHtml(decodeHtmlEntities(card.description ?? '')));
    setImagesDraft(sanitizeCardImages(card.images));
    setImageError(null);
    setEditingCardId(card.id);
    setIsEditing(true);
  };

  const normalizedDescription = useMemo(() => normalizeRichCommentHtml(description), [description]);
  const normalizedImages = useMemo(() => sanitizeCardImages(imagesDraft), [imagesDraft]);
  const cardImages = useMemo(() => sanitizeCardImages(card?.images), [card?.images]);
  const checklist = useMemo(() => sanitizeChecklistItems(card?.checklist), [card?.checklist]);
  const checklistTotal = checklist.length;
  const checklistDone = useMemo(() => {
    let done = 0;
    for (const item of checklist) {
      if (item.done) done += 1;
    }
    return done;
  }, [checklist]);
  const canMutateChecklist = !!card && !readOnly && !inEditMode && !!onChecklistChange;
  const canAddChecklistItem = canMutateChecklist && checklistDraftText.trim().length > 0 && checklistTotal < MAX_CHECKLIST_ITEMS;

  const commitChecklist = useCallback(
    async (nextChecklist: CardChecklistItem[]) => {
      if (!card || !onChecklistChange) return;
      setChecklistBusy(true);
      try {
        await onChecklistChange(sanitizeChecklistItems(nextChecklist));
      } finally {
        setChecklistBusy(false);
      }
    },
    [card, onChecklistChange]
  );

  const addChecklistItem = useCallback(() => {
    if (!canMutateChecklist) return;
    const text = checklistDraftText.trim().slice(0, MAX_CHECKLIST_ITEM_TEXT_LEN);
    if (!text) return;
    if (checklist.length >= MAX_CHECKLIST_ITEMS) return;

    const nextChecklist: CardChecklistItem[] = [
      ...checklist,
      {
        id: createChecklistItemId(),
        text,
        done: false,
        createdAt: Date.now(),
      },
    ];
    setChecklistDraftText('');
    void commitChecklist(nextChecklist);
  }, [canMutateChecklist, checklistDraftText, checklist, commitChecklist]);

  const toggleChecklistItem = useCallback(
    (itemId: string) => {
      if (!canMutateChecklist) return;
      const nextChecklist = checklist.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      );
      void commitChecklist(nextChecklist);
    },
    [canMutateChecklist, checklist, commitChecklist]
  );

  const removeChecklistItem = useCallback(
    (itemId: string) => {
      if (!canMutateChecklist) return;
      const nextChecklist = checklist.filter((item) => item.id !== itemId);
      void commitChecklist(nextChecklist);
    },
    [canMutateChecklist, checklist, commitChecklist]
  );

  const canSave = useMemo(() => {
    if (readOnly || !card || !inEditMode) return false;
    return (
      title.trim() !== (card.title ?? '').trim() ||
      normalizedDescription !== normalizeRichCommentHtml(card.description ?? '') ||
      !sameCardImages(normalizedImages, cardImages)
    );
  }, [title, normalizedDescription, normalizedImages, cardImages, card, readOnly, inEditMode]);

  const canAddComment = useMemo(
    () => hasRichCommentContent(commentText) || commentImages.length > 0,
    [commentText, commentImages]
  );
  const editingComment = useMemo(
    () => (editingCommentId ? comments.find((comment) => comment.id === editingCommentId) ?? null : null),
    [comments, editingCommentId]
  );
  const editingCommentImages = useMemo(
    () => sanitizeCardImages(editingComment?.images),
    [editingComment?.images]
  );
  const visibleCommentImagesById = useMemo(() => {
    const map = new Map<string, CardImage[]>();
    for (const comment of visibleComments) {
      map.set(comment.id, sanitizeCardImages(comment.images));
    }
    return map;
  }, [visibleComments]);
  const canSaveCommentEdit = useMemo(() => {
    if (!editingCommentId || !editingComment) return false;
    const nextText = normalizeRichCommentHtml(commentText);
    const hasPayload = hasRichCommentContent(nextText) || commentImages.length > 0;
    return (
      hasPayload &&
      (nextText !== normalizeRichCommentHtml(editingComment.text) || !sameCardImages(commentImages, editingCommentImages))
    );
  }, [editingCommentId, editingComment, commentText, commentImages, editingCommentImages]);

  const creatorLabel = (card?.createdBy ?? '').trim() || t('card.creator.unknown');
  const cardMetaTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale]
  );
  const cardCreatedAtLabel = useMemo(() => {
    const ts = Number(card?.createdAt ?? 0);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    return t('card.createdAt.inline', { date: cardMetaTimeFormatter.format(ts) });
  }, [card?.createdAt, cardMetaTimeFormatter, t]);
  const effectiveStatus = useMemo(() => {
    if (cardColumn) return cardColumn;
    const raw = card?.status;
    if (raw === 'freedom') return 'freedom' as const;
    if (raw === 'queue' || raw === 'doing' || raw === 'review' || raw === 'done') return raw;
    return 'queue' as const;
  }, [card?.status, cardColumn]);
  const effectiveStatusLabel = useMemo(
    () => (effectiveStatus === 'freedom' ? t('column.freedom') : t(STATUS_COLUMN_LABEL_KEY[effectiveStatus])),
    [effectiveStatus, t]
  );
  const canChangeStatus = Boolean(card && onChangeStatus);

  const handleStatusSelect = useCallback(
    async (nextCol: ColumnId) => {
      if (!card || !onChangeStatus || statusActionBusy) return;
      if (effectiveStatus === nextCol) {
        setStatusMenuOpen(false);
        return;
      }
      setStatusActionBusy(true);
      setStatusMenuOpen(false);
      try {
        await onChangeStatus(nextCol);
      } finally {
        setStatusActionBusy(false);
      }
    },
    [card, onChangeStatus, statusActionBusy, effectiveStatus]
  );

  const commentTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale]
  );
  const commentDayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    [locale]
  );
  const groupedVisibleComments = useMemo(() => {
    const now = Date.now();
    const dayStartNow = new Date(now).setHours(0, 0, 0, 0);
    const groups: Array<{ key: string; label: string; items: CardComment[] }> = [];
    const groupsMap = new Map<string, { key: string; label: string; items: CardComment[] }>();

    for (const comment of visibleComments) {
      const ts = Number.isFinite(comment.createdAt) ? comment.createdAt : 0;
      let key = 'unknown';
      let label = t('modal.comments.time.unknown');

      if (ts > 0) {
        const dayStart = new Date(ts).setHours(0, 0, 0, 0);
        const diffDays = Math.floor((dayStartNow - dayStart) / 86400000);
        key = String(dayStart);
        if (diffDays === 0) label = t('history.today');
        else if (diffDays === 1) label = t('history.yesterday');
        else label = commentDayFormatter.format(ts);
      }

      let group = groupsMap.get(key);
      if (!group) {
        group = { key, label, items: [] };
        groupsMap.set(key, group);
        groups.push(group);
      }
      group.items.push(comment);
    }

    return groups;
  }, [commentDayFormatter, t, visibleComments]);

  const shouldVirtualizeComments = expandedComments && visibleComments.length >= BOARD_PERF.comments.virtualization.threshold;
  const commentVirtualRows = useMemo<CommentVirtualRow[]>(() => {
    const rows: CommentVirtualRow[] = [];
    for (const group of groupedVisibleComments) {
      rows.push({ kind: 'day', key: `day-${group.key}`, label: group.label });
      for (const comment of group.items) {
        rows.push({ kind: 'comment', key: `comment-${comment.id}`, comment });
      }
    }
    return rows;
  }, [groupedVisibleComments]);

  const commentVirtualMetrics = useMemo(() => {
    if (!shouldVirtualizeComments || commentVirtualRows.length === 0) return null;

    const offsets = new Array(commentVirtualRows.length + 1);
    offsets[0] = 0;

    for (let i = 0; i < commentVirtualRows.length; i += 1) {
      const row = commentVirtualRows[i];
      const estimated = row.kind === 'day' ? BOARD_PERF.comments.virtualization.dayRowEstimate : BOARD_PERF.comments.virtualization.itemRowEstimate;
      const nextHeight = Math.max(estimated, commentVirtualHeights[row.key] ?? 0);
      offsets[i + 1] = offsets[i] + nextHeight;
    }

    const totalHeight = offsets[offsets.length - 1];
    const viewportHeight = Math.max(1, commentsViewportHeight || 1);
    const viewportTop = Math.max(0, commentsScrollTop);
    const viewportBottom = viewportTop + viewportHeight;
    const firstVisible = findVirtualRowIndex(offsets, viewportTop);
    const lastVisible = findVirtualRowIndex(offsets, viewportBottom);
    const startIndex = Math.max(0, firstVisible - BOARD_PERF.comments.virtualization.overscan);
    const endIndex = Math.min(commentVirtualRows.length - 1, lastVisible + BOARD_PERF.comments.virtualization.overscan);
    const topSpacer = offsets[startIndex];
    const bottomSpacer = Math.max(0, totalHeight - offsets[endIndex + 1]);

    return {
      rows: commentVirtualRows.slice(startIndex, endIndex + 1),
      topSpacer,
      bottomSpacer,
    };
  }, [commentVirtualHeights, commentVirtualRows, commentsScrollTop, commentsViewportHeight, shouldVirtualizeComments]);

  const measureCommentVirtualRow = useCallback((rowKey: string, node: HTMLDivElement | null) => {
    if (!node) return;
    const nextHeight = Math.ceil(node.getBoundingClientRect().height);
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
    setCommentVirtualHeights((prev) => {
      const prevHeight = prev[rowKey] ?? 0;
      if (prevHeight === nextHeight) return prev;
      return { ...prev, [rowKey]: nextHeight };
    });
  }, []);

  const handleCommentsScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const nextTopRaw = Number(event?.currentTarget?.scrollTop ?? 0);
    const nextTop = Number.isFinite(nextTopRaw) ? nextTopRaw : 0;
    pendingCommentsScrollTopRef.current = nextTop;
    if (commentsScrollRafRef.current != null) return;
    commentsScrollRafRef.current = window.requestAnimationFrame(() => {
      commentsScrollRafRef.current = null;
      const committedTop = pendingCommentsScrollTopRef.current;
      setCommentsScrollTop((prev) => (prev === committedTop ? prev : committedTop));
    });
  }, []);

  const renderCommentPreviewItem = useCallback(
    (comment: CardComment) => {
      const ts = Number.isFinite(comment.createdAt) ? comment.createdAt : 0;
      const commentImages = visibleCommentImagesById.get(comment.id) ?? [];
      const hasCommentText = hasRichCommentContent(comment.text);
      const hasCommentImages = commentImages.length > 0;
      const showImageHint = hasCommentText && hasCommentImages;
      const showInlineImages = !hasCommentText && hasCommentImages;
      return (
        <article
          className={`modalCommentItem modalCommentItemCompact ${freshCommentId === comment.id ? 'isFresh' : ''} ${
            editingCommentId === comment.id ? 'isEditing' : ''
          }`}
          data-comment-item-id={comment.id}
          role="button"
          tabIndex={0}
          aria-label={t('modal.comments.openSingle')}
          onClick={(event) => {
            const target = event.target;
            if (target instanceof Element && target.closest('button, a, input, textarea, select')) return;
            setFocusedCommentId(comment.id);
            setCommentDeleteConfirmId(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            setFocusedCommentId(comment.id);
            setCommentDeleteConfirmId(null);
          }}
        >
          <div className={`modalCommentBody ${showImageHint ? 'hasMedia' : ''} ${showInlineImages ? 'hasInlineMedia' : ''}`}>
            <header className="modalCommentMeta modalCommentMetaCompact">
              <div className="modalCommentInfo modalCommentInfoRow">
                <span className="modalCommentAuthor">{comment.author || t('modal.comments.author.unknown')}</span>
                {ts > 0 ? (
                  <time className="modalCommentTime" dateTime={new Date(ts).toISOString()}>
                    {commentTimeFormatter.format(ts)}
                  </time>
                ) : (
                  <span className="modalCommentTime">{t('modal.comments.time.unknown')}</span>
                )}
              </div>
            </header>
            {hasCommentText ? (
              <div
                className="modalCommentText modalCommentTextRich"
                dangerouslySetInnerHTML={{ __html: renderRichCommentHtml(comment.text) }}
              />
            ) : null}
            {showInlineImages ? (
              <div className="modalCommentInlineImages">
                {commentImages.map((image, imageIndex) => (
                  <button
                    key={image.id}
                    type="button"
                    className="cardImageThumb cardImageThumbView modalCommentInlineImageBtn"
                    onClick={() => openImagePreview(commentImages, imageIndex)}
                    title={t('modal.comments.images.preview')}
                    aria-label={t('modal.comments.images.preview')}
                  >
                    <img src={getCardImagePreviewUrl(image)} alt={image.name || t('modal.images.item')} loading="lazy" />
                  </button>
                ))}
              </div>
            ) : null}
            {showImageHint ? (
              <button
                type="button"
                className="modalCommentImageHint"
                onClick={() => openImagePreview(commentImages, 0)}
                title={t('modal.comments.images.preview')}
                aria-label={t('modal.comments.images.preview')}
              >
                <ImageGlyph className="modalCommentImageHintIcon" />
                <span className="modalCommentImageHintCount" aria-hidden="true">
                  {commentImages.length}
                </span>
              </button>
            ) : null}
          </div>
        </article>
      );
    },
    [commentTimeFormatter, editingCommentId, freshCommentId, openImagePreview, t, visibleCommentImagesById]
  );

  const archiveReasonLabel = useCallback(
    (reason: 'all' | 'overflow' | 'delete' | 'card-delete' | 'unknown') => {
      if (reason === 'delete') return t('modal.comments.archive.reason.delete');
      if (reason === 'card-delete') return t('modal.comments.archive.reason.cardDelete');
      if (reason === 'overflow') return t('modal.comments.archive.reason.overflow');
      return t('modal.comments.archive.reason.all');
    },
    [t]
  );

  const loadArchivedComments = useCallback(
    async (reset: boolean) => {
      if (!canShowArchive || !onLoadCommentArchive || !activeCardId) return;
      const offset = reset ? 0 : commentArchiveOffset;
      setCommentArchiveLoading(true);
      setCommentArchiveError(null);
      try {
        const response = await onLoadCommentArchive({
          limit: BOARD_PERF.comments.archivePageSize,
          offset,
          order: 'desc',
          reason: commentArchiveReason,
        });
        if (!response) {
          setCommentArchiveError(t('modal.comments.archive.error.load'));
          return;
        }

        const incoming = Array.isArray(response.archivedComments) ? response.archivedComments : [];
        setCommentArchiveItems((prev) => {
          if (reset) return incoming;
          const next = prev.slice();
          const seen = new Set(prev.map((item) => item.archiveId));
          for (const item of incoming) {
            if (seen.has(item.archiveId)) continue;
            seen.add(item.archiveId);
            next.push(item);
          }
          return next;
        });
        const returned = Number(response.pagination?.returned ?? incoming.length);
        const nextOffset =
          response.pagination && Number.isFinite(Number(response.pagination.nextOffset))
            ? Math.max(0, Math.trunc(Number(response.pagination.nextOffset)))
            : offset + returned;
        setCommentArchiveOffset(nextOffset);
        setCommentArchiveCount(Math.max(0, Math.trunc(Number(response.archivedCount ?? incoming.length))));
        const hasMore =
          response.pagination?.hasMore ??
          (nextOffset < Math.max(0, Math.trunc(Number(response.archivedCount ?? incoming.length))));
        setCommentArchiveHasMore(Boolean(hasMore));
      } catch {
        setCommentArchiveError(t('modal.comments.archive.error.load'));
      } finally {
        setCommentArchiveLoading(false);
      }
    },
    [
      activeCardId,
      canShowArchive,
      commentArchiveOffset,
      commentArchiveReason,
      onLoadCommentArchive,
      t,
    ]
  );

  const restoreArchivedComment = useCallback(
    async (archiveId: number) => {
      if (!canShowArchive || !onRestoreArchivedComment || !activeCardId) return;
      if (!Number.isFinite(Number(archiveId)) || Number(archiveId) <= 0) return;
      setCommentArchiveRestoringId(Math.trunc(Number(archiveId)));
      setCommentArchiveError(null);
      setCommentActionBusy(true);
      pendingScrollToBottomRef.current = true;
      try {
        const ok = await onRestoreArchivedComment(Math.trunc(Number(archiveId)));
        if (!ok) {
          setCommentArchiveError(t('modal.comments.archive.error.restore'));
          return;
        }
        setCommentArchiveItems((prev) => prev.filter((item) => item.archiveId !== archiveId));
        setCommentArchiveCount((prev) => Math.max(0, prev - 1));
        if (commentArchiveNoticeTimerRef.current) {
          window.clearTimeout(commentArchiveNoticeTimerRef.current);
        }
        setCommentArchiveNotice(t('modal.comments.archive.notice.restored'));
        commentArchiveNoticeTimerRef.current = window.setTimeout(() => {
          setCommentArchiveNotice(null);
          commentArchiveNoticeTimerRef.current = null;
        }, 2200);
      } catch {
        setCommentArchiveError(t('modal.comments.archive.error.restore'));
      } finally {
        setCommentArchiveRestoringId(null);
        setCommentActionBusy(false);
      }
    },
    [activeCardId, canShowArchive, onRestoreArchivedComment, t]
  );

  useEffect(() => {
    if (!isShown) return;
    if (!activeCardId) return;
    if (lastOpenedCardIdRef.current === activeCardId) return;
    lastOpenedCardIdRef.current = activeCardId;
    pendingScrollToBottomRef.current = true;
    setExpandedCommentsCardId(null);
    setCommentDeleteConfirmId(null);
    setCommentActionError(null);
    setImageError(null);
    setChecklistDraftText('');
    setChecklistBusy(false);
    closeImagePreview();
    setTextPaletteOpen(false);
    setHighlightPaletteOpen(false);
    pendingTypingStyleRef.current = { textColor: null, highlightColor: null };
    setActiveFormats({ bold: false, italic: false, strike: false, list: false, textColor: null, highlightColor: null });
    setCommentEditDraft({ cardId: activeCardId, commentId: null, text: '' });
    setCommentImagesDraft([]);
    setCommentImageError(null);
    setImagesDraft(sanitizeCardImages(card?.images));
    setCommentArchiveOpen(false);
    setCommentArchiveReason('all');
    setCommentArchiveItems([]);
    setCommentArchiveCount(0);
    setCommentArchiveOffset(0);
    setCommentArchiveHasMore(false);
    setCommentArchiveError(null);
    setCommentArchiveRestoringId(null);
    setCommentArchiveNotice(null);
    setFocusedCommentId(null);
  }, [activeCardId, isShown, closeImagePreview, card?.images]);

  useEffect(() => {
    if (!isShown || !showCommentsUi || !commentArchiveOpen) return;
    void loadArchivedComments(true);
  }, [commentArchiveOpen, commentArchiveReason, isShown, showCommentsUi, loadArchivedComments]);

  useEffect(() => {
    if (!isShown || !showCommentsUi || commentArchiveOpen) return;
    const node = commentsScrollRef.current;
    if (!node) return;

    const syncMetrics = () => {
      setCommentsViewportHeight(node.clientHeight || 0);
      setCommentsScrollTop(node.scrollTop || 0);
    };

    syncMetrics();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => syncMetrics());
    observer.observe(node);
    return () => observer.disconnect();
  }, [commentArchiveOpen, groupedVisibleComments.length, isShown, showCommentsUi]);

  useEffect(() => {
    if (!isShown) return;
    if (!pendingScrollToBottomRef.current) return;
    const node = commentsScrollRef.current;
    if (!node) return;
    node.scrollTop = 0;
    setCommentsScrollTop(0);
    pendingScrollToBottomRef.current = false;
  }, [isShown, activeCardId, visibleComments.length]);

  useEffect(() => {
    if (!isShown || !activeCardId) return;
    const newestComment = sortedComments.length > 0 ? sortedComments[0] : null;
    const prev = prevCommentsSnapshotRef.current;

    if (prev.cardId !== activeCardId) {
      prevCommentsSnapshotRef.current = {
        cardId: activeCardId,
        count: sortedComments.length,
        lastId: newestComment?.id ?? null,
      };
      setFreshCommentId(null);
      return;
    }

    const hasNewComment = sortedComments.length > prev.count && !!newestComment && newestComment.id !== prev.lastId;
    if (hasNewComment && newestComment) {
      setFreshCommentId(newestComment.id);
      if (freshCommentTimerRef.current) {
        window.clearTimeout(freshCommentTimerRef.current);
      }
      freshCommentTimerRef.current = window.setTimeout(() => {
        setFreshCommentId((current) => (current === newestComment.id ? null : current));
        freshCommentTimerRef.current = null;
      }, 1500);
    }

    prevCommentsSnapshotRef.current = {
      cardId: activeCardId,
      count: sortedComments.length,
      lastId: newestComment?.id ?? null,
    };
  }, [isShown, activeCardId, sortedComments]);

  useEffect(() => {
    if (!commentDeleteConfirmId) return;
    if (sortedComments.some((comment) => comment.id === commentDeleteConfirmId)) return;
    setCommentDeleteConfirmId(null);
  }, [commentDeleteConfirmId, sortedComments]);

  useEffect(() => {
    if (!focusedCommentId) return;
    if (comments.some((comment) => comment.id === focusedCommentId)) return;
    setFocusedCommentId(null);
  }, [comments, focusedCommentId]);

  useEffect(() => {
    if (!statusMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = statusMenuRef.current;
      if (!root) return;
      const target = event.target;
      if (target instanceof Node && root.contains(target)) return;
      setStatusMenuOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [statusMenuOpen]);

  useEffect(() => {
    if (!textPaletteOpen && !highlightPaletteOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const toolbar = commentToolbarRef.current;
      if (!toolbar) return;
      const target = event.target;
      if (target instanceof Node && toolbar.contains(target)) return;
      setTextPaletteOpen(false);
      setHighlightPaletteOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [highlightPaletteOpen, textPaletteOpen]);

  useEffect(
    () => () => {
      if (freshCommentTimerRef.current) {
        window.clearTimeout(freshCommentTimerRef.current);
      }
      if (commentArchiveNoticeTimerRef.current) {
        window.clearTimeout(commentArchiveNoticeTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!isShown) return;
    const node = mainModalRef.current;
    if (!node) return;

    const updateHeight = () => {
      const next = Math.max(220, Math.round(node.getBoundingClientRect().height));
      setCommentsPanelHeight((prev) => (prev === next ? prev : next));
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [isShown, activeCardId]);

  useEffect(() => {
    if (!isShown) return;
    const editor = commentInputRef.current;
    if (!editor) return;
    if (skipEditorSyncRef.current) {
      skipEditorSyncRef.current = false;
      return;
    }
    const targetText = inEditMode ? description : commentText;
    if (editor.innerHTML !== targetText) {
      editor.innerHTML = targetText;
    }
  }, [commentText, description, isShown, activeCardId, inEditMode]);

  const syncDraftFromEditor = useCallback(() => {
    const editor = commentInputRef.current;
    if (!editor) return;
    skipEditorSyncRef.current = true;
    if (inEditMode) {
      setDescription(editor.innerHTML);
      return;
    }
    setCommentDraft({ cardId: activeCardId, text: editor.innerHTML });
  }, [activeCardId, inEditMode]);

  const focusCommentEditor = useCallback(() => {
    const editor = commentInputRef.current;
    if (!editor) return null;
    editor.focus();
    return editor;
  }, []);

  const ensureEditorSelection = useCallback((editor: HTMLDivElement) => {
    const selection = window.getSelection();
    if (!selection) return null;
    if (selection.rangeCount > 0) {
      const current = selection.getRangeAt(0);
      const node = current.commonAncestorContainer;
      if (node === editor || editor.contains(node)) return current;
    }
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return range;
  }, []);

  const updateActiveFormats = useCallback(() => {
    const editor = commentInputRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      setActiveFormats((prev) =>
        prev.bold || prev.italic || prev.strike || prev.list || prev.textColor || prev.highlightColor
          ? { bold: false, italic: false, strike: false, list: false, textColor: null, highlightColor: null }
          : prev
      );
      return;
    }

    const range = selection.getRangeAt(0);
    const commonNode = range.commonAncestorContainer;
    if (!(commonNode === editor || editor.contains(commonNode))) {
      setActiveFormats((prev) =>
        prev.bold || prev.italic || prev.strike || prev.list || prev.textColor || prev.highlightColor
          ? { bold: false, italic: false, strike: false, list: false, textColor: null, highlightColor: null }
          : prev
      );
      return;
    }

    const query = (command: string) => {
      try {
        return !!document.queryCommandState(command);
      } catch {
        return false;
      }
    };

    // Цветовые кнопки отражают только явно выбранные пользователем настройки
    // (через toolbar), а не стиль выделенного текста.
    const textColor = pendingTypingStyleRef.current.textColor;
    const highlightColor = pendingTypingStyleRef.current.highlightColor;

    const next = {
      bold: query('bold'),
      italic: query('italic'),
      strike: query('strikeThrough'),
      list: query('insertUnorderedList'),
      textColor,
      highlightColor,
    };

    setActiveFormats((prev) => {
      if (
        prev.bold === next.bold &&
        prev.italic === next.italic &&
        prev.strike === next.strike &&
        prev.list === next.list &&
        prev.textColor === next.textColor &&
        prev.highlightColor === next.highlightColor
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const scheduleActiveFormatsUpdate = useCallback(() => {
    if (formatsRafRef.current != null) return;
    formatsRafRef.current = window.requestAnimationFrame(() => {
      formatsRafRef.current = null;
      updateActiveFormats();
    });
  }, [updateActiveFormats]);

  useEffect(() => {
    if (!isShown) return;
    const onSelectionChange = () => scheduleActiveFormatsUpdate();
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      if (formatsRafRef.current != null) {
        window.cancelAnimationFrame(formatsRafRef.current);
        formatsRafRef.current = null;
      }
    };
  }, [isShown, scheduleActiveFormatsUpdate]);

  const execEditorCommand = useCallback(
    (command: string, value?: string) => {
      if (commentActionBusy) return;
      const editor = focusCommentEditor();
      if (!editor) return;
      document.execCommand('styleWithCSS', false, 'false');
      document.execCommand(command, false, value);
      syncDraftFromEditor();
      updateActiveFormats();
      setTextPaletteOpen(false);
      setHighlightPaletteOpen(false);
    },
    [commentActionBusy, focusCommentEditor, syncDraftFromEditor, updateActiveFormats]
  );

  const applyColorCommand = useCallback(
    (kind: 'text' | 'highlight', color: string) => {
      if (commentActionBusy) return;
      const normalized = normalizeColor(color);
      if (!normalized) return;
      const editor = focusCommentEditor();
      if (!editor) return;
      ensureEditorSelection(editor);
      if (kind === 'text') pendingTypingStyleRef.current.textColor = normalized;
      else pendingTypingStyleRef.current.highlightColor = normalized;
      document.execCommand('styleWithCSS', false, 'true');
      if (kind === 'text') document.execCommand('foreColor', false, normalized);
      else {
        const ok = document.execCommand('hiliteColor', false, normalized);
        if (!ok) document.execCommand('backColor', false, normalized);
      }
      syncDraftFromEditor();
      updateActiveFormats();
      setTextPaletteOpen(false);
      setHighlightPaletteOpen(false);
    },
    [commentActionBusy, ensureEditorSelection, focusCommentEditor, syncDraftFromEditor, updateActiveFormats]
  );

  const clearColorSetting = useCallback(
    (kind: 'text' | 'highlight') => {
      if (kind === 'text') pendingTypingStyleRef.current.textColor = null;
      else pendingTypingStyleRef.current.highlightColor = null;

      setActiveFormats((prev) => ({
        ...prev,
        textColor: kind === 'text' ? null : prev.textColor,
        highlightColor: kind === 'highlight' ? null : prev.highlightColor,
      }));

      const editor = focusCommentEditor();
      if (editor) {
        ensureEditorSelection(editor);
        document.execCommand('styleWithCSS', false, 'true');
        if (kind === 'text') {
          document.execCommand('foreColor', false, '#0f172a');
        } else {
          const ok = document.execCommand('hiliteColor', false, '#ffffff');
          if (!ok) document.execCommand('backColor', false, '#ffffff');
        }
        syncDraftFromEditor();
      }
      updateActiveFormats();
      setTextPaletteOpen(false);
      setHighlightPaletteOpen(false);
    },
    [ensureEditorSelection, focusCommentEditor, syncDraftFromEditor, updateActiveFormats]
  );

  const resetCommentComposerFormatting = useCallback(() => {
    pendingTypingStyleRef.current = { textColor: null, highlightColor: null };
    setActiveFormats({ bold: false, italic: false, strike: false, list: false, textColor: null, highlightColor: null });
    setTextPaletteOpen(false);
    setHighlightPaletteOpen(false);
  }, []);

  const openCardImagePicker = () => {
    if (!inEditMode) return;
    const input = cardImageInputRef.current;
    if (!input) return;
    input.value = '';
    input.click();
  };

  const handleCardImageFiles = async (files: FileList | File[] | null) => {
    const current = sanitizeCardImages(imagesDraft);
    const { images, rejected, quotaExceeded, rateLimited } = await loadCardImagesFromFiles(files, current);
    if (images.length > 0) {
      setImagesDraft([...current, ...images]);
    }
    if (rateLimited) {
      setImageError(t('modal.images.error.rateLimit'));
    } else if (quotaExceeded) {
      setImageError(t('modal.images.error.quota'));
    } else if (rejected.length > 0) {
      setImageError(
        t('modal.images.error.limit', {
          maxCount: MAX_CARD_IMAGES,
          maxSizeKb: Math.trunc(MAX_CARD_IMAGE_BYTES / 1024),
        })
      );
    } else {
      setImageError(null);
    }
  };

  const extractClipboardImageFiles = (clipboardData: DataTransfer | null): File[] => {
    if (!clipboardData) return [];
    const files: File[] = [];
    for (const item of Array.from(clipboardData.items ?? [])) {
      if (item.kind !== 'file') continue;
      if (!item.type.toLowerCase().startsWith('image/')) continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    return files;
  };

  const removeCardImage = (imageId: string) => {
    if (!inEditMode) return;
    setImagesDraft((prev) => prev.filter((image) => image.id !== imageId));
  };

  const openCommentImagePicker = () => {
    const input = commentImageInputRef.current;
    if (!input) return;
    input.value = '';
    input.click();
  };

  const handleCommentImageFiles = async (files: FileList | File[] | null) => {
    const current = sanitizeCardImages(commentImagesDraft);
    const { images, rejected, quotaExceeded, rateLimited } = await loadCardImagesFromFiles(files, current);
    if (images.length > 0) {
      setCommentImagesDraft([...current, ...images]);
    }
    if (rateLimited) {
      setCommentImageError(t('modal.images.error.rateLimit'));
    } else if (quotaExceeded) {
      setCommentImageError(t('modal.images.error.quota'));
    } else if (rejected.length > 0) {
      setCommentImageError(
        t('modal.images.error.limit', {
          maxCount: MAX_CARD_IMAGES,
          maxSizeKb: Math.trunc(MAX_CARD_IMAGE_BYTES / 1024),
        })
      );
    } else {
      setCommentImageError(null);
    }
  };

  const removeCommentImage = (imageId: string) => {
    setCommentImagesDraft((prev) => prev.filter((image) => image.id !== imageId));
  };

  const handleCommentImagePick = (event: { target: { files: FileList | null } }) => {
    void handleCommentImageFiles(event.target.files);
  };

  const submitComment = async () => {
    const text = normalizeRichCommentHtml(commentText);
    const hasText = hasRichCommentContent(text);
    if (!hasText && commentImages.length === 0) return;
    const payload = hasText ? text.trim() : '';
    setTextPaletteOpen(false);
    setHighlightPaletteOpen(false);
    setCommentActionError(null);
    setCommentActionBusy(true);
    pendingScrollToBottomRef.current = true;
    try {
      const ok = await onAddComment(payload, commentImages);
      if (!ok) {
        setCommentActionError(t('modal.comments.error.add'));
        return;
      }
      setCommentDraft({ cardId: activeCardId, text: '' });
      setCommentImagesDraft([]);
      setCommentImageError(null);
      resetCommentComposerFormatting();
    } catch (err) {
      setCommentActionError(
        isRateLimitedError(err) ? t('modal.comments.error.rateLimit') : t('modal.comments.error.add')
      );
    } finally {
      setCommentActionBusy(false);
    }
  };

  const currentAuthorKey = String(commentAuthor ?? '')
    .trim()
    .toLowerCase();
  const isOwnComment = (comment: CardComment) => {
    const authorKey = String(comment.author ?? '')
      .trim()
      .toLowerCase();
    return !!authorKey && !!currentAuthorKey && authorKey === currentAuthorKey;
  };

  const beginCommentEdit = (comment: CardComment) => {
    if (!activeCardId) return;
    setFocusedCommentId(null);
    resetCommentComposerFormatting();
    setCommentActionError(null);
    setCommentDeleteConfirmId(null);
    setCommentDraft({
      cardId: activeCardId,
      text: normalizeRichCommentHtml(comment.text),
    });
    setCommentImagesDraft(sanitizeCardImages(comment.images));
    setCommentImageError(null);
    setCommentEditDraft({
      cardId: activeCardId,
      commentId: comment.id,
      text: normalizeRichCommentHtml(comment.text),
    });
    window.setTimeout(() => {
      const editor = commentInputRef.current;
      if (!editor) return;
      editor.focus();
      ensureEditorSelection(editor);
    }, 0);
  };

  const cancelCommentEdit = () => {
    resetCommentComposerFormatting();
    setCommentDraft({
      cardId: activeCardId,
      text: '',
    });
    setCommentImagesDraft([]);
    setCommentImageError(null);
    setCommentEditDraft({
      cardId: activeCardId,
      commentId: null,
      text: '',
    });
  };

  const saveCommentEdit = async () => {
    const targetCommentId = editingCommentId;
    const nextText = normalizeRichCommentHtml(commentText);
    const hasText = hasRichCommentContent(nextText);
    if (!targetCommentId || (!hasText && commentImages.length === 0)) return;
    const payload = hasText ? nextText.trim() : '';

    setCommentActionError(null);
    setCommentActionBusy(true);
    try {
      const ok = await onUpdateComment(targetCommentId, payload, commentImages);
      if (!ok) {
        setCommentActionError(t('modal.comments.error.update'));
        return;
      }
      cancelCommentEdit();
    } catch (err) {
      setCommentActionError(
        isRateLimitedError(err) ? t('modal.comments.error.rateLimit') : t('modal.comments.error.update')
      );
    } finally {
      setCommentActionBusy(false);
    }
  };

  const removeComment = async (comment: CardComment) => {
    setCommentActionError(null);
    setCommentActionBusy(true);
    try {
      const ok = await onDeleteComment(comment.id);
      if (!ok) {
        setCommentActionError(t('modal.comments.error.delete'));
        return;
      }
      setCommentDeleteConfirmId((prev) => (prev === comment.id ? null : prev));
      setFocusedCommentId((prev) => (prev === comment.id ? null : prev));
      if (editingCommentId === comment.id) {
        cancelCommentEdit();
      }
    } catch (err) {
      setCommentActionError(
        isRateLimitedError(err) ? t('modal.comments.error.rateLimit') : t('modal.comments.error.delete')
      );
    } finally {
      setCommentActionBusy(false);
    }
  };

  useEffect(() => {
    if (!isShown) {
      setStatusMenuOpen(false);
      setStatusActionBusy(false);
      return;
    }
    setStatusMenuOpen(false);
  }, [activeCardId, isShown]);

  useEffect(() => {
    return () => {
      if (commentsScrollRafRef.current != null) {
        window.cancelAnimationFrame(commentsScrollRafRef.current);
        commentsScrollRafRef.current = null;
      }
      if (formatsRafRef.current != null) {
        window.cancelAnimationFrame(formatsRafRef.current);
        formatsRafRef.current = null;
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isShown && card ? (
        <motion.div
          className="backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={motionProfile.modalBackdropTransition}
        >
          <motion.div
            className={`modalEditDock ${hasAnyComments && showCommentsUi ? '' : 'modalEditDockSolo'}`}
            data-col={effectiveStatus === 'freedom' ? 'queue' : effectiveStatus}
            onMouseDown={(e) => e.stopPropagation()}
            initial={motionProfile.modalSurfaceInitial}
            animate={motionProfile.modalSurfaceAnimate}
            exit={motionProfile.modalSurfaceExit}
            transition={motionProfile.modalSurfaceTransition}
          >
            <div
              className="modal modalEdit modalEditMain"
              data-u={card.urgency}
              data-col={cardColumn ?? undefined}
              ref={mainModalRef}
            >
              <div className="modalHead">
                <div className="modalTitleWrap">
                  <div className="modalMetaRow">
                    <span className={`modalUrgency modalUrgency_${card.urgency}`}>
                      <span className="modalUrgencyLabel">{t(URGENCY_LABEL_KEY[card.urgency])}</span>
                    </span>
                    {readOnly ? <div className="doneSubtitle">{t('modal.edit.done')}</div> : null}
                  </div>

                  <h2 className="modalTitle" title={card.title || t('common.untitled')}>
                    {card.title || t('common.untitled')}
                  </h2>
                  <p className="modalCreatorText" title={t('card.creator.title', { name: creatorLabel })}>
                    {t('card.creator.inline', { name: creatorLabel })}
                  </p>
                  {cardCreatedAtLabel ? <p className="modalCardCreatedAtText">{cardCreatedAtLabel}</p> : null}
                  <div className="modalStatusRow">
                    <span className="modalStatusLabel">{t('modal.status.label')}</span>
                    <div className={`modalStatusWrap ${statusMenuOpen ? 'isOpen' : ''}`} ref={statusMenuRef}>
                      <button
                        type="button"
                        className={`modalStatusBtn modalStatusBtn_${effectiveStatus}`}
                        aria-haspopup="listbox"
                        aria-expanded={statusMenuOpen}
                        title={t('modal.status.change')}
                        onClick={() => {
                          if (!canChangeStatus || statusActionBusy) return;
                          setStatusMenuOpen((prev) => !prev);
                        }}
                        disabled={!canChangeStatus || statusActionBusy}
                      >
                        <span className={`modalStatusValue modalStatusValue_${effectiveStatus}`}>{effectiveStatusLabel}</span>
                        <svg className="modalStatusArrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M4 6.2 8 10l4-3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                      <AnimatePresence initial={false}>
                        {statusMenuOpen ? (
                          <motion.div
                            className="modalStatusMenu"
                            role="listbox"
                            initial={{ opacity: 0, y: -5, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -5, scale: 0.98 }}
                            transition={motionProfile.controlLayoutTransition}
                          >
                            {STATUS_COLUMN_ORDER.map((statusCol) => {
                              const isActive = effectiveStatus === statusCol;
                              return (
                                <button
                                  key={statusCol}
                                  type="button"
                                  role="option"
                                  aria-selected={isActive}
                                  className={`modalStatusOption modalStatusOption_${statusCol} ${isActive ? 'isActive' : ''}`}
                                  onClick={() => {
                                    void handleStatusSelect(statusCol);
                                  }}
                                  disabled={statusActionBusy}
                                >
                                  {t(STATUS_COLUMN_LABEL_KEY[statusCol])}
                                </button>
                              );
                            })}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="modalActions">
                  {showDoingTimer ? (
                    <div className="modalTimer" title={t('modal.timer.title')}>
                      <span className="modalTimerIcon" aria-hidden="true">
                        <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M8 4.7v3.6l2.4 1.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </span>
                      <span className="modalTimerText">{formatDoingDuration(doingMs ?? 0, lang)}</span>
                    </div>
                  ) : null}

                  <button
                    className={`iconMini modalFavoriteBtn ${card.isFavorite ? 'isActive' : ''}`}
                    onClick={toggleFavorite}
                    title={card.isFavorite ? t('card.favorite.remove') : t('card.favorite.add')}
                    aria-label={card.isFavorite ? t('card.favorite.remove') : t('card.favorite.add')}
                  >
                    <FavoriteGlyph className="favoriteGlyph" />
                  </button>

                  {!readOnly && !inEditMode ? (
                    <button className="iconMini" onClick={startEditing} title={t('modal.edit.edit')} aria-label={t('modal.edit.edit')}>
                      <CommentEditGlyph className="modalCommentActionIcon modalHeadEditIcon" />
                    </button>
                  ) : null}

                  <button className="iconMini" onClick={close} title={t('common.close')} aria-label={t('common.close')}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="modalHeadCloseIcon">
                      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className={`modalBody ${inEditMode ? 'editBody' : ''}`}>
                {!inEditMode ? (
                  <div className="viewTextContent">
                    <div className="noteBox">
                      {card.description?.trim() ? (
                        <div className="viewText modalCommentTextRich" dangerouslySetInnerHTML={{ __html: renderRichCommentHtml(card.description) }} />
                      ) : (
                        <div className="viewText">
                          <span className="viewEmpty">—</span>
                        </div>
                      )}
                    </div>
                    {cardImages.length > 0 ? (
                      <div className="cardImagesRail cardImagesRailView cardImagesRailViewUnder" aria-label={t('modal.images.title')}>
                        {cardImages.map((image, imageIndex) => (
                          <button
                            key={image.id}
                            type="button"
                            className="cardImageThumb cardImageThumbView"
                            onClick={() => openImagePreview(cardImages, imageIndex)}
                            title={t('modal.images.preview')}
                            aria-label={t('modal.images.preview')}
                          >
                            <img src={getCardImagePreviewUrl(image)} alt={image.name || t('modal.images.item')} loading="lazy" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="editField">
                      <div className="label">{t('modal.edit.titleLabel')}</div>
                      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>

                    <div className="editField">
                      <div className="label">{t('modal.edit.textLabel')}</div>
                      <div className="modalCommentComposer modalCommentComposerInline editCommentComposer">
                        <div className="modalCommentToolbar editCommentToolbar" ref={commentToolbarRef} onMouseDown={(event) => event.preventDefault()}>
                          <button
                            type="button"
                            className={`modalCommentToolBtn ${activeFormats.bold ? 'isEnabled' : ''}`}
                            onClick={() => execEditorCommand('bold')}
                            title={t('modal.comments.toolbar.bold')}
                            aria-label={t('modal.comments.toolbar.bold')}
                          >
                            B
                          </button>
                          <button
                            type="button"
                            className={`modalCommentToolBtn modalCommentToolBtnItalic ${activeFormats.italic ? 'isEnabled' : ''}`}
                            onClick={() => execEditorCommand('italic')}
                            title={t('modal.comments.toolbar.italic')}
                            aria-label={t('modal.comments.toolbar.italic')}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            className={`modalCommentToolBtn modalCommentToolBtnStrike ${activeFormats.strike ? 'isEnabled' : ''}`}
                            onClick={() => execEditorCommand('strikeThrough')}
                            title={t('modal.comments.toolbar.strike')}
                            aria-label={t('modal.comments.toolbar.strike')}
                          >
                            S
                          </button>
                          <button
                            type="button"
                            className={`modalCommentToolBtn ${activeFormats.list ? 'isEnabled' : ''}`}
                            onClick={() => execEditorCommand('insertUnorderedList')}
                            title={t('modal.comments.toolbar.list')}
                            aria-label={t('modal.comments.toolbar.list')}
                          >
                            <CommentListGlyph className="modalCommentListIcon" />
                          </button>

                          <div className="modalCommentToolColorWrap">
                            <button
                              type="button"
                              className={`modalCommentToolBtn ${textPaletteOpen || !!activeFormats.textColor ? 'isActive' : ''}`}
                              onClick={() => {
                                setTextPaletteOpen((prev) => !prev);
                                setHighlightPaletteOpen(false);
                              }}
                              title={t('modal.comments.toolbar.textColor')}
                              aria-label={t('modal.comments.toolbar.textColor')}
                            >
                              A
                            </button>
                            {textPaletteOpen ? (
                              <div className="modalCommentColorPalette" role="menu" aria-label={t('modal.comments.toolbar.textColor')}>
                                {COMMENT_TEXT_COLORS.map((color) => (
                                  <button
                                    key={color.className}
                                    type="button"
                                    className={`modalCommentColorDot ${sameColor(activeFormats.textColor, color.color) ? 'isSelected' : ''}`}
                                    style={{ backgroundColor: color.color }}
                                    onClick={() => applyColorCommand('text', color.color)}
                                    aria-label={`${t('modal.comments.toolbar.textColor')} ${color.color}`}
                                    title={color.color}
                                  />
                                ))}
                                <button
                                  type="button"
                                  className="modalCommentPaletteReset"
                                  onClick={() => clearColorSetting('text')}
                                  aria-label={t('common.clear')}
                                  title={t('common.clear')}
                                >
                                  ×
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div className="modalCommentToolColorWrap">
                            <button
                              type="button"
                              className={`modalCommentToolBtn ${highlightPaletteOpen || !!activeFormats.highlightColor ? 'isActive' : ''}`}
                              onClick={() => {
                                setHighlightPaletteOpen((prev) => !prev);
                                setTextPaletteOpen(false);
                              }}
                              title={t('modal.comments.toolbar.highlight')}
                              aria-label={t('modal.comments.toolbar.highlight')}
                            >
                              ⬛
                            </button>
                            {highlightPaletteOpen ? (
                              <div className="modalCommentColorPalette" role="menu" aria-label={t('modal.comments.toolbar.highlight')}>
                                {COMMENT_HIGHLIGHT_COLORS.map((color) => (
                                  <button
                                    key={color.className}
                                    type="button"
                                    className={`modalCommentColorDot modalCommentColorDotLight ${sameColor(activeFormats.highlightColor, color.color) ? 'isSelected' : ''}`}
                                    style={{ backgroundColor: color.color }}
                                    onClick={() => applyColorCommand('highlight', color.color)}
                                    aria-label={`${t('modal.comments.toolbar.highlight')} ${color.color}`}
                                    title={color.color}
                                  />
                                ))}
                                <button
                                  type="button"
                                  className="modalCommentPaletteReset"
                                  onClick={() => clearColorSetting('highlight')}
                                  aria-label={t('common.clear')}
                                  title={t('common.clear')}
                                >
                                  ×
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="modalCommentComposerRow modalCommentComposerRowInline">
                          <div
                            className="modalCommentInput modalCommentInputRich editRichEditor"
                            ref={commentInputRef}
                            contentEditable
                            suppressContentEditableWarning
                            role="textbox"
                            aria-multiline="true"
                            aria-label={t('modal.edit.textLabel')}
                            data-placeholder={t('modal.create.textPlaceholder')}
                            data-empty={hasRichCommentContent(description) ? 'false' : 'true'}
                            onInput={(e) => {
                              const plain = String(e.currentTarget.textContent ?? '')
                                .replace(/\u00a0/g, ' ')
                                .trim();
                              if (!plain) {
                                if (e.currentTarget.innerHTML !== '') {
                                  e.currentTarget.innerHTML = '';
                                  ensureEditorSelection(e.currentTarget);
                                }
                                skipEditorSyncRef.current = true;
                                setDescription('');
                                updateActiveFormats();
                                return;
                              }
                              skipEditorSyncRef.current = true;
                              setDescription(e.currentTarget.innerHTML);
                              updateActiveFormats();
                            }}
                            onFocus={() => updateActiveFormats()}
                            onBeforeInput={() => {
                              const editor = commentInputRef.current;
                              if (!editor) return;
                              const selection = window.getSelection();
                              if (!selection || selection.rangeCount === 0) return;
                              const range = selection.getRangeAt(0);
                              const commonNode = range.commonAncestorContainer;
                              if (!(commonNode === editor || editor.contains(commonNode))) return;
                              if (!range.collapsed) return;
                              const { textColor, highlightColor } = pendingTypingStyleRef.current;
                              if (!textColor && !highlightColor) return;
                              document.execCommand('styleWithCSS', false, 'true');
                              if (textColor) document.execCommand('foreColor', false, textColor);
                              if (highlightColor) {
                                const ok = document.execCommand('hiliteColor', false, highlightColor);
                                if (!ok) document.execCommand('backColor', false, highlightColor);
                              }
                            }}
                            onPaste={(e) => {
                              const imageFiles = extractClipboardImageFiles(e.clipboardData);
                              if (imageFiles.length > 0) {
                                e.preventDefault();
                                void handleCardImageFiles(imageFiles);
                                return;
                              }
                              e.preventDefault();
                              const text = e.clipboardData.getData('text/plain');
                              document.execCommand('insertText', false, text);
                              updateActiveFormats();
                            }}
                          />
                        </div>
                        {normalizedImages.length > 0 ? (
                          <div className="cardImagesRail cardImagesRailEdit" aria-label={t('modal.images.title')}>
                            {normalizedImages.map((image, imageIndex) => (
                              <div key={image.id} className="cardImageThumbWrap cardImageThumbWrapEdit">
                                <button
                                  type="button"
                                  className="cardImageThumb cardImageThumbEdit"
                                  onClick={() => openImagePreview(normalizedImages, imageIndex)}
                                  title={t('modal.images.preview')}
                                  aria-label={t('modal.images.preview')}
                                >
                                  <img src={getCardImagePreviewUrl(image)} alt={image.name || t('modal.images.item')} loading="lazy" />
                                </button>
                                <button
                                  type="button"
                                  className="cardImageRemoveBtn"
                                  onClick={() => removeCardImage(image.id)}
                                  title={t('modal.images.remove')}
                                  aria-label={t('modal.images.remove')}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {imageError ? <p className="cardImagesError">{imageError}</p> : null}
                      </div>
                    </div>
                  </>
                )}

                {!inEditMode ? (
                  <section className="modalChecklistPanel" aria-label={t('modal.checklist.title')}>
                    <div className="modalChecklistHead">
                      <p className="modalChecklistTitle">{t('modal.checklist.title')}</p>
                      <span className={`modalChecklistProgress ${checklistDone === checklistTotal && checklistTotal > 0 ? 'isComplete' : ''}`}>
                        {t('modal.checklist.progress', { done: checklistDone, total: checklistTotal })}
                      </span>
                    </div>

                    {checklistTotal === 0 ? (
                      <p className="modalChecklistEmpty">{t('modal.checklist.empty')}</p>
                    ) : (
                      <div className="modalChecklistList">
                        {checklist.map((item) => (
                          <div key={item.id} className={`modalChecklistItem ${item.done ? 'isDone' : ''}`}>
                            <button
                              type="button"
                              className={`modalChecklistToggle ${item.done ? 'isDone' : ''}`}
                              onClick={() => toggleChecklistItem(item.id)}
                              title={t('modal.checklist.toggle')}
                              aria-label={t('modal.checklist.toggle')}
                              disabled={!canMutateChecklist || checklistBusy}
                            >
                              <span className="modalChecklistCheckmark" aria-hidden="true">
                                {item.done ? '✓' : ''}
                              </span>
                            </button>
                            <span className="modalChecklistText" title={item.text}>
                              {item.text}
                            </span>
                            {canMutateChecklist ? (
                              <button
                                type="button"
                                className="modalChecklistRemove"
                                onClick={() => removeChecklistItem(item.id)}
                                title={t('modal.checklist.remove')}
                                aria-label={t('modal.checklist.remove')}
                                disabled={checklistBusy}
                              >
                                ×
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}

                    {canMutateChecklist ? (
                      <div className="modalChecklistComposer">
                        <input
                          className="input modalChecklistInput"
                          value={checklistDraftText}
                          onChange={(event) => setChecklistDraftText(event.target.value.slice(0, MAX_CHECKLIST_ITEM_TEXT_LEN))}
                          placeholder={t('modal.checklist.placeholder')}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            addChecklistItem();
                          }}
                          disabled={checklistBusy || checklistTotal >= MAX_CHECKLIST_ITEMS}
                        />
                        <button
                          type="button"
                          className="btn modalChecklistAdd"
                          onClick={addChecklistItem}
                          disabled={!canAddChecklistItem || checklistBusy}
                        >
                          {t('modal.checklist.add')}
                        </button>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {!inEditMode ? (
                  <section className="modalCommentComposerPanel" aria-label={t('modal.comments.title')}>
                    <div className="modalCommentComposer modalCommentComposerInline">
                      <div className="modalCommentToolbar" ref={commentToolbarRef} onMouseDown={(event) => event.preventDefault()}>
                        <button
                          type="button"
                          className={`modalCommentToolBtn ${activeFormats.bold ? 'isEnabled' : ''}`}
                          onClick={() => execEditorCommand('bold')}
                          title={t('modal.comments.toolbar.bold')}
                          aria-label={t('modal.comments.toolbar.bold')}
                          disabled={commentActionBusy}
                        >
                          B
                        </button>
                        <button
                          type="button"
                          className={`modalCommentToolBtn modalCommentToolBtnItalic ${activeFormats.italic ? 'isEnabled' : ''}`}
                          onClick={() => execEditorCommand('italic')}
                          title={t('modal.comments.toolbar.italic')}
                          aria-label={t('modal.comments.toolbar.italic')}
                          disabled={commentActionBusy}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          className={`modalCommentToolBtn modalCommentToolBtnStrike ${activeFormats.strike ? 'isEnabled' : ''}`}
                          onClick={() => execEditorCommand('strikeThrough')}
                          title={t('modal.comments.toolbar.strike')}
                          aria-label={t('modal.comments.toolbar.strike')}
                          disabled={commentActionBusy}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          className={`modalCommentToolBtn ${activeFormats.list ? 'isEnabled' : ''}`}
                          onClick={() => execEditorCommand('insertUnorderedList')}
                          title={t('modal.comments.toolbar.list')}
                          aria-label={t('modal.comments.toolbar.list')}
                          disabled={commentActionBusy}
                        >
                          <CommentListGlyph className="modalCommentListIcon" />
                        </button>

                        <div className="modalCommentToolColorWrap">
                          <button
                            type="button"
                            className={`modalCommentToolBtn ${textPaletteOpen || !!activeFormats.textColor ? 'isActive' : ''}`}
                            onClick={() => {
                              setTextPaletteOpen((prev) => !prev);
                              setHighlightPaletteOpen(false);
                            }}
                            title={t('modal.comments.toolbar.textColor')}
                            aria-label={t('modal.comments.toolbar.textColor')}
                            disabled={commentActionBusy}
                          >
                            A
                          </button>
                          {textPaletteOpen ? (
                            <div className="modalCommentColorPalette" role="menu" aria-label={t('modal.comments.toolbar.textColor')}>
                              {COMMENT_TEXT_COLORS.map((color) => (
                                <button
                                  key={color.className}
                                  type="button"
                                  className={`modalCommentColorDot ${sameColor(activeFormats.textColor, color.color) ? 'isSelected' : ''}`}
                                  style={{ backgroundColor: color.color }}
                                  onClick={() => applyColorCommand('text', color.color)}
                                  aria-label={`${t('modal.comments.toolbar.textColor')} ${color.color}`}
                                  title={color.color}
                                />
                              ))}
                              <button
                                type="button"
                                className="modalCommentPaletteReset"
                                onClick={() => clearColorSetting('text')}
                                aria-label={t('common.clear')}
                                title={t('common.clear')}
                              >
                                ×
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <div className="modalCommentToolColorWrap">
                          <button
                            type="button"
                            className={`modalCommentToolBtn ${highlightPaletteOpen || !!activeFormats.highlightColor ? 'isActive' : ''}`}
                            onClick={() => {
                              setHighlightPaletteOpen((prev) => !prev);
                              setTextPaletteOpen(false);
                            }}
                            title={t('modal.comments.toolbar.highlight')}
                            aria-label={t('modal.comments.toolbar.highlight')}
                            disabled={commentActionBusy}
                          >
                            ⬛
                          </button>
                          {highlightPaletteOpen ? (
                            <div className="modalCommentColorPalette" role="menu" aria-label={t('modal.comments.toolbar.highlight')}>
                              {COMMENT_HIGHLIGHT_COLORS.map((color) => (
                                <button
                                  key={color.className}
                                  type="button"
                                  className={`modalCommentColorDot modalCommentColorDotLight ${sameColor(activeFormats.highlightColor, color.color) ? 'isSelected' : ''}`}
                                  style={{ backgroundColor: color.color }}
                                  onClick={() => applyColorCommand('highlight', color.color)}
                                  aria-label={`${t('modal.comments.toolbar.highlight')} ${color.color}`}
                                  title={color.color}
                                />
                              ))}
                              <button
                                type="button"
                                className="modalCommentPaletteReset"
                                onClick={() => clearColorSetting('highlight')}
                                aria-label={t('common.clear')}
                                title={t('common.clear')}
                              >
                                ×
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="modalCommentComposerRow modalCommentComposerRowInline">
                        <div
                          className="modalCommentInput modalCommentInputRich"
                          ref={commentInputRef}
                          contentEditable={!commentActionBusy}
                          suppressContentEditableWarning
                          role="textbox"
                          aria-multiline="true"
                          aria-label={t('modal.comments.placeholder')}
                          data-placeholder={t('modal.comments.placeholder')}
                          data-empty={canAddComment ? 'false' : 'true'}
                          onInput={(e) => {
                            const plain = String(e.currentTarget.textContent ?? '')
                              .replace(/\u00a0/g, ' ')
                              .trim();
                            if (!plain) {
                              if (e.currentTarget.innerHTML !== '') {
                                e.currentTarget.innerHTML = '';
                                ensureEditorSelection(e.currentTarget);
                              }
                              skipEditorSyncRef.current = true;
                              setCommentDraft({ cardId: activeCardId, text: '' });
                              updateActiveFormats();
                              return;
                            }
                            const html = e.currentTarget.innerHTML;
                            skipEditorSyncRef.current = true;
                            setCommentDraft({ cardId: activeCardId, text: html });
                            if (editingCommentId) {
                              setCommentEditDraft((prev) =>
                                prev.cardId === activeCardId && prev.commentId
                                  ? { ...prev, text: html }
                                  : prev
                              );
                            }
                            updateActiveFormats();
                          }}
                          onFocus={() => updateActiveFormats()}
                          onBeforeInput={() => {
                            const editor = commentInputRef.current;
                            if (!editor) return;
                            const selection = window.getSelection();
                            if (!selection || selection.rangeCount === 0) return;
                            const range = selection.getRangeAt(0);
                            const commonNode = range.commonAncestorContainer;
                            if (!(commonNode === editor || editor.contains(commonNode))) return;
                            if (!range.collapsed) return;
                            const { textColor, highlightColor } = pendingTypingStyleRef.current;
                            if (!textColor && !highlightColor) return;
                            document.execCommand('styleWithCSS', false, 'true');
                            if (textColor) document.execCommand('foreColor', false, textColor);
                            if (highlightColor) {
                              const ok = document.execCommand('hiliteColor', false, highlightColor);
                              if (!ok) document.execCommand('backColor', false, highlightColor);
                            }
                          }}
                          onPaste={(e) => {
                            const imageFiles = extractClipboardImageFiles(e.clipboardData);
                            if (imageFiles.length > 0) {
                              e.preventDefault();
                              void handleCommentImageFiles(imageFiles);
                              return;
                            }
                            e.preventDefault();
                            const text = e.clipboardData.getData('text/plain');
                            document.execCommand('insertText', false, text);
                            updateActiveFormats();
                          }}
                        />
                        <div className={`modalCommentComposerBottom ${commentImages.length > 0 ? 'hasImages' : ''}`}>
                          {commentImages.length > 0 ? (
                            <div className="cardImagesRail cardImagesRailComment" aria-label={t('modal.comments.images.title')}>
                              {commentImages.map((image, imageIndex) => (
                                <div key={image.id} className="cardImageThumbWrap cardImageThumbWrapComment">
                                  <button
                                    type="button"
                                    className="cardImageThumb cardImageThumbComment"
                                    onClick={() => openImagePreview(commentImages, imageIndex)}
                                    title={t('modal.comments.images.preview')}
                                    aria-label={t('modal.comments.images.preview')}
                                    disabled={commentActionBusy}
                                  >
                                    <img src={getCardImagePreviewUrl(image)} alt={image.name || t('modal.comments.images.item')} loading="lazy" />
                                  </button>
                                  <button
                                    type="button"
                                    className="cardImageRemoveBtn"
                                    onClick={() => removeCommentImage(image.id)}
                                    title={t('modal.comments.images.remove')}
                                    aria-label={t('modal.comments.images.remove')}
                                    disabled={commentActionBusy}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {editingCommentId ? (
                            <div className="modalCommentEditActions modalCommentComposerEditActions">
                              <button
                                type="button"
                                className="btn cardImageActionBtn cardImageActionBtnComment"
                                onClick={openCommentImagePicker}
                                title={t('modal.comments.images.add')}
                                aria-label={t('modal.comments.images.add')}
                                disabled={commentActionBusy}
                              >
                                <ImageGlyph className="cardImageActionBtnIcon" />
                              </button>
                              <button
                                type="button"
                                className="btn modalCommentEditBtn"
                                onClick={cancelCommentEdit}
                                disabled={commentActionBusy}
                              >
                                {t('common.cancel')}
                              </button>
                              <button
                                type="button"
                                className="btn modalCommentEditBtn"
                                onClick={() => {
                                  void saveCommentEdit();
                                }}
                                disabled={!canSaveCommentEdit || commentActionBusy}
                              >
                                {t('common.save')}
                              </button>
                            </div>
                          ) : (
                            <div className="modalCommentSubmitWrap">
                              <button
                                type="button"
                                className="btn cardImageActionBtn cardImageActionBtnComment"
                                onClick={openCommentImagePicker}
                                title={t('modal.comments.images.add')}
                                aria-label={t('modal.comments.images.add')}
                                disabled={commentActionBusy}
                              >
                                <ImageGlyph className="cardImageActionBtnIcon" />
                              </button>
                              <button
                                type="button"
                                className="btn modalCommentSubmit"
                                onClick={() => {
                                  void submitComment();
                                }}
                                disabled={!canAddComment || commentActionBusy}
                              >
                                {t('modal.comments.submit')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <input
                        ref={commentImageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        multiple
                        className="cardImageInputHidden"
                        onChange={handleCommentImagePick}
                      />
                      {commentImageError ? <div className="modalCommentError">{commentImageError}</div> : null}
                      {commentActionError ? <div className="modalCommentError">{commentActionError}</div> : null}
                    </div>
                  </section>
                ) : null}
              </div>

              {inEditMode && !readOnly ? (
                <div className="modalFoot editFoot">
                  <button className="btn" onClick={stopEditing}>
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn cardImageActionBtn"
                    onClick={openCardImagePicker}
                    title={t('modal.images.add')}
                    aria-label={t('modal.images.add')}
                  >
                    <ImageGlyph className="cardImageActionBtnIcon" />
                  </button>
                  <button
                    className="btn btnPrimary"
                    onClick={() => {
                      const nextTitle = title.trim();
                      const nextDescription = normalizedDescription;
                      const nextImages = sanitizeCardImages(imagesDraft);
                      stopEditing();
                      onSave({ title: nextTitle, description: nextDescription, images: nextImages });
                    }}
                    disabled={!canSave}
                  >
                    {t('common.save')}
                  </button>
                </div>
              ) : null}

              <input
                ref={cardImageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="cardImageInputHidden"
                onChange={(event) => {
                  void handleCardImageFiles(event.target.files);
                }}
              />
            </div>

            {(hasAnyComments || canShowArchive) && showCommentsUi ? (
              <aside
                className="modalEditCommentsSide"
                aria-label={t('modal.comments.title')}
                style={commentsPanelHeight ? { height: `${commentsPanelHeight}px` } : undefined}
              >
                <div className="modalEditCommentsSideHead">
                  <p className="modalCommentsTitle">
                    {commentArchiveOpen ? t('modal.comments.archive.title') : t('modal.comments.title')}
                  </p>
                  {canShowArchive ? (
                    <button
                      type="button"
                      className={`modalCommentsArchiveToggle ${commentArchiveOpen ? 'isOpen' : ''}`}
                      onClick={() => {
                        setCommentArchiveOpen((prev) => !prev);
                        setCommentArchiveError(null);
                        setFocusedCommentId(null);
                      }}
                      disabled={commentActionBusy || commentArchiveLoading}
                    >
                      {commentArchiveOpen ? t('modal.comments.archive.back') : t('modal.comments.archive.open')}
                    </button>
                  ) : null}
                </div>

                <AnimatePresence mode="wait" initial={false}>
                {commentArchiveOpen ? (
                  <motion.div
                    key="comments-archive"
                    className="modalCommentsPane"
                    initial={{ opacity: 0, y: 8, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.985 }}
                    transition={{ duration: 0.2, ease: [0.22, 0.84, 0.24, 1] }}
                  >
                    <div className="modalCommentsArchiveTop">
                      <select
                        className="modalCommentsArchiveReasonSelect"
                        value={commentArchiveReason}
                        onChange={(event) => {
                          const nextReason = event.target.value as 'all' | 'overflow' | 'delete' | 'card-delete';
                          setCommentArchiveReason(nextReason);
                          setCommentArchiveOffset(0);
                          setCommentArchiveItems([]);
                          setCommentArchiveHasMore(false);
                          setCommentArchiveError(null);
                        }}
                        disabled={commentArchiveLoading || commentActionBusy}
                      >
                        {COMMENT_ARCHIVE_REASON_ORDER.map((reason) => (
                          <option key={reason} value={reason}>
                            {archiveReasonLabel(reason)}
                          </option>
                        ))}
                      </select>
                      <span className="modalCommentsArchiveCount">
                        {t('modal.comments.archive.count', { count: commentArchiveCount })}
                      </span>
                    </div>
                    <AnimatePresence initial={false}>
                      {commentArchiveNotice ? (
                        <motion.div
                          className="modalCommentsArchiveNotice"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.16, ease: [0.22, 0.84, 0.24, 1] }}
                        >
                          {commentArchiveNotice}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                    <div className="modalCommentsScroll modalCommentsRailScroll">
                      <div className="modalCommentsArchiveList">
                        {commentArchiveItems.map((item) => {
                          const createdAt = Number.isFinite(item.createdAt) ? item.createdAt : 0;
                          const archivedAt = Number.isFinite(item.archivedAt) ? item.archivedAt : 0;
                          const hasText = hasRichCommentContent(item.text);
                          const itemImages = sanitizeCardImages(item.images);
                          return (
                            <article key={item.archiveId} className="modalCommentsArchiveItem">
                              <header className="modalCommentsArchiveItemHead">
                                <span className="modalCommentAuthor">{item.author || t('modal.comments.author.unknown')}</span>
                                <span className="modalCommentsArchiveReason">{archiveReasonLabel(item.archiveReason)}</span>
                              </header>
                              <div className="modalCommentsArchiveMeta">
                                {createdAt > 0 ? (
                                  <time className="modalCommentTime" dateTime={new Date(createdAt).toISOString()}>
                                    {t('modal.comments.archive.createdAt', { date: commentTimeFormatter.format(createdAt) })}
                                  </time>
                                ) : null}
                                {archivedAt > 0 ? (
                                  <time className="modalCommentTime" dateTime={new Date(archivedAt).toISOString()}>
                                    {t('modal.comments.archive.archivedAt', { date: commentTimeFormatter.format(archivedAt) })}
                                  </time>
                                ) : null}
                              </div>
                              {hasText ? (
                                <div
                                  className="modalCommentText modalCommentTextRich"
                                  dangerouslySetInnerHTML={{ __html: renderRichCommentHtml(item.text) }}
                                />
                              ) : null}
                              {itemImages.length > 0 ? (
                                <button
                                  type="button"
                                  className="modalCommentImageHint modalCommentsArchiveImagesHint"
                                  onClick={() => openImagePreview(itemImages, 0)}
                                  title={t('modal.comments.images.preview')}
                                  aria-label={t('modal.comments.images.preview')}
                                >
                                  <ImageGlyph className="modalCommentImageHintIcon" />
                                  <span className="modalCommentImageHintCount" aria-hidden="true">
                                    {itemImages.length}
                                  </span>
                                </button>
                              ) : null}
                              <div className="modalCommentsArchiveItemActions">
                                <button
                                  type="button"
                                  className="modalCommentsArchiveRestore"
                                  onClick={() => {
                                    void restoreArchivedComment(item.archiveId);
                                  }}
                                  disabled={
                                    commentActionBusy || commentArchiveLoading || commentArchiveRestoringId === item.archiveId
                                  }
                                >
                                  {commentArchiveRestoringId === item.archiveId
                                    ? t('common.wait')
                                    : t('modal.comments.archive.restore')}
                                </button>
                              </div>
                            </article>
                          );
                        })}

                        {!commentArchiveLoading && commentArchiveItems.length === 0 ? (
                          <div className="modalCommentsArchiveEmpty">{t('modal.comments.archive.empty')}</div>
                        ) : null}

                        {commentArchiveError ? <div className="modalCommentError">{commentArchiveError}</div> : null}
                      </div>
                    </div>
                    {commentArchiveHasMore ? (
                      <button
                        type="button"
                        className="modalCommentsExpand"
                        onClick={() => {
                          void loadArchivedComments(false);
                        }}
                        disabled={commentArchiveLoading || commentActionBusy}
                      >
                        {commentArchiveLoading ? t('common.wait') : t('modal.comments.archive.loadMore')}
                      </button>
                    ) : null}
                  </motion.div>
                ) : (
                  <motion.div
                    key="comments-live"
                    className="modalCommentsPane"
                    initial={{ opacity: 0, y: 8, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.985 }}
                    transition={{ duration: 0.2, ease: [0.22, 0.84, 0.24, 1] }}
                  >
                  {canExpandComments && !expandedComments ? (
                    <div className="modalCommentsTruncated">{t('modal.comments.truncated', { count: hiddenCommentsCount })}</div>
                  ) : null}

                  {canExpandComments ? (
                    <button
                      type="button"
                      className="modalCommentsExpand"
                      onClick={() => {
                        setExpandedCommentsCardId(expandedComments ? null : activeCardId);
                      }}
                      disabled={commentActionBusy}
                    >
                      {expandedComments ? t('modal.comments.showRecent') : t('modal.comments.showOlder', { count: hiddenCommentsCount })}
                    </button>
                  ) : null}

                    {groupedVisibleComments.length === 0 ? (
                      <div className="modalCommentsArchiveEmpty">{t('modal.comments.empty')}</div>
                    ) : (
                      <div
                        className="modalCommentsScroll modalCommentsRailScroll"
                        ref={commentsScrollRef}
                        onScroll={shouldVirtualizeComments ? handleCommentsScroll : undefined}
                      >
                        {shouldVirtualizeComments && commentVirtualMetrics ? (
                          <div className="modalCommentsList modalCommentsRailList">
                            {commentVirtualMetrics.topSpacer > 0 ? (
                              <div className="virtualSpacer" style={{ height: commentVirtualMetrics.topSpacer }} />
                            ) : null}
                            {commentVirtualMetrics.rows.map((row) =>
                              row.kind === 'day' ? (
                                <div
                                  key={row.key}
                                  ref={(node) => {
                                    measureCommentVirtualRow(row.key, node);
                                  }}
                                  className="modalCommentDayLabel modalCommentDayLabelVirtual"
                                >
                                  {row.label}
                                </div>
                              ) : (
                                <div
                                  key={row.key}
                                  ref={(node) => {
                                    measureCommentVirtualRow(row.key, node);
                                  }}
                                  className="modalCommentVirtualRow"
                                >
                                  {renderCommentPreviewItem(row.comment)}
                                </div>
                              )
                            )}
                            {commentVirtualMetrics.bottomSpacer > 0 ? (
                              <div className="virtualSpacer" style={{ height: commentVirtualMetrics.bottomSpacer }} />
                            ) : null}
                          </div>
                        ) : (
                          <div className="modalCommentsList modalCommentsRailList">
                            {groupedVisibleComments.map((group) => (
                              <section className="modalCommentDayGroup" key={group.key}>
                                <div className="modalCommentDayLabel">{group.label}</div>
                                <div className="modalCommentDayList">
                                  {group.items.map((comment) => (
                                    <div key={comment.id} className="modalCommentVirtualRow">
                                      {renderCommentPreviewItem(comment)}
                                    </div>
                                  ))}
                                </div>
                              </section>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
                </AnimatePresence>
              </aside>
            ) : null}

            <AnimatePresence>
              {focusedComment && showCommentsUi ? (
                <motion.div
                  className="modalCommentFocusBackdrop"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setFocusedCommentId(null);
                      setCommentDeleteConfirmId(null);
                    }
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.div
                    className="modalCommentFocusCard"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    onMouseDown={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <button
                      type="button"
                      className="modalCommentFocusClose"
                      onClick={() => {
                        setFocusedCommentId(null);
                        setCommentDeleteConfirmId(null);
                      }}
                      title={t('common.close')}
                      aria-label={t('common.close')}
                    >
                      ×
                    </button>

                    <article className="modalCommentItem modalCommentItemFocus">
                      <div
                        className={`modalCommentBody modalCommentBodyFocus ${
                          hasRichCommentContent(focusedComment.text) && focusedCommentImages.length > 0 ? 'hasMedia' : ''
                        } ${!hasRichCommentContent(focusedComment.text) && focusedCommentImages.length > 0 ? 'hasInlineMedia' : ''}`}
                      >
                        <header className="modalCommentMeta modalCommentMetaCompact">
                          <div className="modalCommentInfo modalCommentInfoRow">
                            <span className="modalCommentAuthor">{focusedComment.author || t('modal.comments.author.unknown')}</span>
                            {Number.isFinite(focusedComment.createdAt) && focusedComment.createdAt > 0 ? (
                              <time className="modalCommentTime" dateTime={new Date(focusedComment.createdAt).toISOString()}>
                                {commentTimeFormatter.format(focusedComment.createdAt)}
                              </time>
                            ) : (
                              <span className="modalCommentTime">{t('modal.comments.time.unknown')}</span>
                            )}
                          </div>
                        </header>
                        {hasRichCommentContent(focusedComment.text) ? (
                          <div
                            className="modalCommentText modalCommentTextRich"
                            dangerouslySetInnerHTML={{ __html: renderRichCommentHtml(focusedComment.text) }}
                          />
                        ) : null}
                        {!hasRichCommentContent(focusedComment.text) && focusedCommentImages.length > 0 ? (
                          <div className="modalCommentInlineImages">
                            {focusedCommentImages.map((image, imageIndex) => (
                              <button
                                key={image.id}
                                type="button"
                                className="cardImageThumb cardImageThumbView modalCommentInlineImageBtn"
                                onClick={() => openImagePreview(focusedCommentImages, imageIndex)}
                                title={t('modal.comments.images.preview')}
                                aria-label={t('modal.comments.images.preview')}
                              >
                                <img src={getCardImagePreviewUrl(image)} alt={image.name || t('modal.images.item')} loading="lazy" />
                              </button>
                            ))}
                          </div>
                        ) : null}
                        {hasRichCommentContent(focusedComment.text) && focusedCommentImages.length > 0 ? (
                          <button
                            type="button"
                            className="modalCommentImageHint"
                            onClick={() => openImagePreview(focusedCommentImages, 0)}
                            title={t('modal.comments.images.preview')}
                            aria-label={t('modal.comments.images.preview')}
                          >
                            <ImageGlyph className="modalCommentImageHintIcon" />
                            <span className="modalCommentImageHintCount" aria-hidden="true">
                              {focusedCommentImages.length}
                            </span>
                          </button>
                        ) : null}
                      </div>
                      {isOwnComment(focusedComment) && commentDeleteConfirmId === focusedComment.id ? (
                        <div className="modalCommentDeleteConfirm" role="alertdialog" aria-live="polite">
                          <div className="modalCommentDeleteConfirmText">{t('modal.comments.deleteConfirm')}</div>
                          <div className="modalCommentDeleteConfirmActions">
                            <button
                              type="button"
                              className="modalCommentDeleteConfirmBtn"
                              onClick={() => {
                                setCommentDeleteConfirmId(null);
                              }}
                              disabled={commentActionBusy}
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              type="button"
                              className="modalCommentDeleteConfirmBtn isDanger"
                              onClick={() => {
                                void removeComment(focusedComment);
                              }}
                              disabled={commentActionBusy}
                            >
                              {t('modal.comments.delete')}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                    {isOwnComment(focusedComment) ? (
                      <div className="modalCommentFocusDockActions">
                        <button
                          type="button"
                          className="modalCommentActionBtn"
                          onClick={() => {
                            beginCommentEdit(focusedComment);
                          }}
                          disabled={commentActionBusy}
                          title={t('modal.comments.edit')}
                          aria-label={t('modal.comments.edit')}
                        >
                          <CommentEditGlyph className="modalCommentActionIcon" />
                        </button>
                        <button
                          type="button"
                          className="modalCommentActionBtn modalCommentActionBtnDanger"
                          onClick={() => {
                            setCommentDeleteConfirmId((prev) => (prev === focusedComment.id ? null : focusedComment.id));
                          }}
                          disabled={commentActionBusy}
                          title={t('modal.comments.delete')}
                          aria-label={t('modal.comments.delete')}
                        >
                          <CommentDeleteGlyph className="modalCommentActionIcon" />
                        </button>
                      </div>
                    ) : null}
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {imagePreview ? (
                <motion.div
                  className="cardImagePreviewBackdrop"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) closeImagePreview();
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.div
                    className="cardImagePreviewModal"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <button
                      type="button"
                      className="cardImagePreviewClose"
                      onClick={closeImagePreview}
                      title={t('common.close')}
                      aria-label={t('common.close')}
                    >
                      ×
                    </button>
                    {imagePreviewImages.length > 1 ? (
                      <>
                        <button
                          type="button"
                          className="cardImagePreviewNav cardImagePreviewNavPrev"
                          onClick={() => shiftImagePreview(-1)}
                          disabled={imagePreviewIndex <= 0}
                          title={t('modal.images.prev')}
                          aria-label={t('modal.images.prev')}
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="cardImagePreviewNav cardImagePreviewNavNext"
                          onClick={() => shiftImagePreview(1)}
                          disabled={imagePreviewIndex >= imagePreviewImages.length - 1}
                          title={t('modal.images.next')}
                          aria-label={t('modal.images.next')}
                        >
                          ›
                        </button>
                        <div className="cardImagePreviewCounter">
                          {t('modal.images.counter', { current: imagePreviewIndex + 1, total: imagePreviewImages.length })}
                        </div>
                      </>
                    ) : null}
                    {previewImageLoadFailed ? (
                      <div className="cardImagePreviewError">{t('modal.images.error.load')}</div>
                    ) : (
                      <img
                        src={imagePreview.dataUrl}
                        alt=""
                        className="cardImagePreviewFull"
                        onError={() => {
                          setPreviewImageLoadFailed(true);
                        }}
                      />
                    )}
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}



