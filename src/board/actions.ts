import type { BoardState, Card, CardChecklistItem, CardImage, ColumnId, Urgency } from './types';

export type UndoPayload = {
  card: Card;
  col: ColumnId;
  index: number;
};

export type BoardAction =
  | {
      type: 'STATE_REPLACE';
      state: BoardState;
    }
  | {
      type: 'CARD_CREATE';
      now: number;
      cardId: string;
      title: string;
      description: string;
      images: CardImage[];
      createdBy: string | null;
      urgency: Urgency;
      historyId: string;
    }
  | {
      type: 'CARD_UPDATE';
      cardId: string;
      patch: { title: string; description: string; images: CardImage[] };
    }
  | {
      type: 'CARD_CHECKLIST_SET';
      cardId: string;
      checklist: CardChecklistItem[];
    }
  | {
      type: 'CARD_TOGGLE_FAVORITE';
      cardId: string;
    }
  | {
    type: 'CARD_COMMENT_ADD';
    cardId: string;
    comment: {
      id: string;
      text: string;
      images: CardImage[];
      createdAt: number;
      updatedAt?: number;
      author: string | null;
    };
  }
  | {
      type: 'CARD_COMMENT_UPDATE';
      cardId: string;
      commentId: string;
      text: string;
      images: CardImage[];
    }
  | {
      type: 'CARD_COMMENT_DELETE';
      cardId: string;
      commentId: string;
    }
  | {
      type: 'CARD_MOVE';
      now: number;
      cardId: string;
      toCol: ColumnId;
      toIndex: number;
      historyId: string;
    }
  | {
      type: 'CARD_FLOAT';
      now: number;
      cardId: string;
      x: number;
      y: number;
      swayOffsetMs?: number;
    }
  | {
      type: 'CARD_DOCK';
      now: number;
      cardId: string;
      toCol: ColumnId;
      toIndex: number;
      historyId: string;
    }
  | {
      type: 'CARD_DELETE';
      now: number;
      cardId: string;
      historyId: string;
    }
  | {
      type: 'UNDO_RESTORE';
      now: number;
      payload: UndoPayload;
      historyId: string;
    }
  | {
      type: 'HISTORY_CLEAR';
    };
