import { memo, useMemo, useCallback, type CSSProperties, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useI18n } from '../i18n';
import type { Card, ColumnId } from './types';
import { formatDoingDuration } from './timeFormat';
import { richCommentToPlainText } from './richComment';

type Props = {
  card: Card;
  columnId: ColumnId;
  now?: number;
  searchQuery: string;
  highlightPulse: number;
  uncrumpleToken: number;
  onOpen: (cardId: string) => void;
};

function CommentsGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M6.45 6.35h11.1A2.2 2.2 0 0 1 19.75 8.55v6.2a2.2 2.2 0 0 1-2.2 2.2h-5.26l-3.64 2.4v-2.4H6.45a2.2 2.2 0 0 1-2.2-2.2v-6.2a2.2 2.2 0 0 1 2.2-2.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.95"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.2 10.15h7.2M8.2 13.15h5.35" fill="none" stroke="currentColor" strokeWidth="1.95" strokeLinecap="round" />
    </svg>
  );
}

function ChecklistGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M7.2 6.4h10.2M7.2 11.9h10.2M7.2 17.4h10.2M4.7 6.4h.1M4.7 11.9h.1M4.7 17.4h.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}


function formatCardId(id: string) {
  const normalized = id.trim();
  if (/^P-\d+$/i.test(normalized)) return normalized.toUpperCase();
  if (normalized.length <= 8) return normalized.toUpperCase();
  return `${normalized.slice(0, 6).toUpperCase()}...`;
}

function extractCardCreatorName(createdBy: string | null | undefined): string {
  const creator = String(createdBy ?? '').trim();
  return creator ? creator.slice(0, 64) : '';
}

function renderSearchHighlight(text: string, query: string, pulse: number, keyPrefix: string): ReactNode {
  if (!query || pulse <= 0) return text;
  const source = text ?? '';
  if (!source) return source;

  const haystack = source.toLowerCase();
  const needle = query.toLowerCase();
  if (!needle) return source;

  const parts: ReactNode[] = [];
  let cursor = 0;
  let hit = 0;

  while (cursor < source.length) {
    const found = haystack.indexOf(needle, cursor);
    if (found === -1) break;

    if (found > cursor) parts.push(source.slice(cursor, found));
    const end = found + needle.length;
    parts.push(
      <mark key={`${keyPrefix}-${pulse}-${hit}-${found}`} className="searchHit searchHitPulse">
        {source.slice(found, end)}
      </mark>
    );
    cursor = end;
    hit += 1;
  }

  if (hit === 0) return source;
  if (cursor < source.length) parts.push(source.slice(cursor));
  return <>{parts}</>;
}

function SortableCardInner({
  card,
  columnId,
  now,
  searchQuery,
  highlightPulse,
  uncrumpleToken,
  onOpen,
}: Props) {
  const { lang, t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0 : 1,
  };

  const timerLabel = useMemo(() => {
    if (columnId !== 'doing') return null;

    const elapsed = card.doingStartedAt != null && now != null ? Math.max(0, now - card.doingStartedAt) : 0;
    const total = card.doingTotalMs + elapsed;

    return formatDoingDuration(total, lang);
  }, [columnId, now, card.doingTotalMs, card.doingStartedAt, lang]);

  const handleClick = useCallback(() => {
    if (isDragging) return;
    onOpen(card.id);
  }, [isDragging, onOpen, card.id]);
  const cardIdLabel = useMemo(() => formatCardId(card.id), [card.id]);
  const titleText = card.title || t('common.untitled');
  const descText = useMemo(() => richCommentToPlainText(card.description || '') || '-', [card.description]);
  const creatorText = extractCardCreatorName(card.createdBy) || t('card.creator.unknown');
  const commentsCount = Array.isArray(card.comments) ? card.comments.length : 0;
  const checklist = Array.isArray(card.checklist) ? card.checklist : [];
  const checklistTotal = checklist.length;
  const checklistDone = useMemo(() => {
    let done = 0;
    for (const item of checklist) {
      if (item?.done === true) done += 1;
    }
    return done;
  }, [checklist]);

  const highlightedId = useMemo(
    () => renderSearchHighlight(cardIdLabel, searchQuery, highlightPulse, `id-${card.id}`),
    [cardIdLabel, searchQuery, highlightPulse, card.id]
  );
  const highlightedCreator = useMemo(
    () => renderSearchHighlight(creatorText, searchQuery, highlightPulse, `creator-${card.id}`),
    [creatorText, searchQuery, highlightPulse, card.id]
  );

  const highlightedTitle = useMemo(
    () => renderSearchHighlight(titleText, searchQuery, highlightPulse, `title-${card.id}`),
    [titleText, searchQuery, highlightPulse, card.id]
  );

  const highlightedDesc = useMemo(
    () => renderSearchHighlight(descText, searchQuery, highlightPulse, `desc-${card.id}`),
    [descText, searchQuery, highlightPulse, card.id]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${timerLabel ? 'hasTimer' : ''} ${card.isFavorite ? 'isFavoriteCard' : ''} ${isDragging ? 'isDragging' : ''} ${uncrumpleToken ? 'cardUncrumple' : ''}`}
      data-card-id={card.id}
      data-u={card.urgency}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <div className="urgBar" />
      <div className="cardMeta">
        <span className="cardId" title={t('card.id.title', { id: card.id })}>
          {highlightedId}
        </span>
        {commentsCount > 0 ? (
          <span
            key={`comments-${card.id}-${commentsCount}`}
            className="cardComments cardCommentsPulse"
            title={t('card.comments.title', { count: commentsCount })}
            aria-label={t('card.comments.title', { count: commentsCount })}
          >
            <CommentsGlyph className="cardCommentsIcon" />
            <span className="cardCommentsText">{commentsCount}</span>
          </span>
        ) : null}
        {checklistTotal > 0 ? (
          <span
            className={`cardChecklist ${checklistDone === checklistTotal ? 'isComplete' : ''}`}
            title={t('card.checklist.title', { done: checklistDone, total: checklistTotal })}
            aria-label={t('card.checklist.title', { done: checklistDone, total: checklistTotal })}
          >
            <ChecklistGlyph className="cardChecklistIcon" />
            <span className="cardChecklistText">{`${checklistDone}/${checklistTotal}`}</span>
          </span>
        ) : null}
        {timerLabel ? (
          <div className="cardTimer" title={t('card.timer.title', { time: timerLabel })}>
            <span className="cardTimerIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path
                  d="M15 3.75h-6M10.75 2.75h2.5v2h-2.5zM12 7a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 0v4.25m0 0 2.75 1.75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="cardTimerText">{timerLabel}</span>
          </div>
        ) : null}
      </div>
      <p className="cardCreator" title={t('card.creator.title', { name: creatorText })}>
        {highlightedCreator}
      </p>

      <p className="cardTitle">{highlightedTitle}</p>
      <p className="cardDesc">{highlightedDesc}</p>
    </div>
  );
}

export const SortableCard = memo(
  SortableCardInner,
  (a, b) =>
    a.card === b.card &&
    a.columnId === b.columnId &&
    a.now === b.now &&
    a.searchQuery === b.searchQuery &&
    a.highlightPulse === b.highlightPulse &&
    a.uncrumpleToken === b.uncrumpleToken &&
    a.onOpen === b.onOpen
);



