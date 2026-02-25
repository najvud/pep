export type ColumnId = 'queue' | 'doing' | 'review' | 'done';
export type CardStatus = ColumnId | 'freedom';
export type Urgency = 'white' | 'yellow' | 'pink' | 'red';
export type HistoryKind = 'create' | 'move' | 'delete' | 'restore';

export type HistoryMeta = {
  title?: string;
  fromCol?: ColumnId | null;
  toCol?: ColumnId | null;
  doingDeltaMs?: number;
};

export type CardComment = {
  id: string;
  text: string;
  images: CardImage[];
  createdAt: number;
  updatedAt?: number;
  author: string | null;
};

export type CardImage = {
  id: string;
  fileId?: string | null;
  dataUrl: string;
  mime: string;
  size: number;
  name: string;
  createdAt: number;
  previewFileId?: string | null;
  previewUrl?: string;
  previewMime?: string;
  previewSize?: number;
};

export type CardChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
};

export type Card = {
  id: string;
  title: string;
  description: string;
  createdBy: string | null;
  createdAt: number;
  status: CardStatus;
  urgency: Urgency;
  isFavorite: boolean;
  comments: CardComment[];
  images: CardImage[];
  checklist: CardChecklistItem[];

  doingStartedAt: number | null;
  doingTotalMs: number;
};

export type HistoryEntry = {
  id: string;
  at: number;
  text: string;
  cardId: string | null;
  kind?: HistoryKind;
  meta?: HistoryMeta;
};

export type FloatingCardPin = {
  x: number;
  y: number;
  swayOffsetMs: number;
};

export type BoardState = {
  cardsById: Record<string, Card>;
  columns: Record<ColumnId, string[]>;
  floatingById: Record<string, FloatingCardPin>;
  history: HistoryEntry[];
};
