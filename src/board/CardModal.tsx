import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { useI18n } from '../i18n';
import { hasRichCommentContent, normalizeRichCommentHtml } from './richComment';
import { useMotionProfile } from './useMotionProfile';
import { MAX_CARD_IMAGES, MAX_CARD_IMAGE_BYTES, getCardImagePreviewUrl, loadCardImagesFromFiles, sanitizeCardImages } from './cardImages';
import type { CardImage, Urgency } from './types';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: { title: string; description: string; images: CardImage[]; urgency: Urgency }) => void;
};

const URGENCY_OPTIONS: Array<{ key: Urgency; labelKey: string; tone: string }> = [
  { key: 'white', labelKey: 'urgency.white', tone: 'white' },
  { key: 'yellow', labelKey: 'urgency.yellow', tone: 'yellow' },
  { key: 'pink', labelKey: 'urgency.pink', tone: 'pink' },
  { key: 'red', labelKey: 'urgency.red', tone: 'red' },
];

const TEXT_COLORS = ['#0f172a', '#1d4ed8', '#0f766e', '#b45309', '#be123c', '#7c3aed'] as const;
const HIGHLIGHT_COLORS = ['#fef08a', '#fed7aa', '#bfdbfe', '#bbf7d0', '#fbcfe8', '#e9d5ff', '#ffffff'] as const;

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
  const toHex = (part: string) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, '0');
  return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
}

function sameColor(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = normalizeColor(left);
  const b = normalizeColor(right);
  if (!a || !b) return false;
  return a === b;
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

export function CardModal({ open, onClose, onCreate }: Props) {
  const { t } = useI18n();
  const motionProfile = useMotionProfile();

  const [title, setTitle] = useState('');
  const [descriptionHtml, setDescriptionHtml] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('white');
  const [images, setImages] = useState<CardImage[]>([]);
  const [imagePreview, setImagePreview] = useState<CardImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
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

  const titleRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const skipEditorSyncRef = useRef(false);
  const pendingTypingStyleRef = useRef<{ textColor: string | null; highlightColor: string | null }>({
    textColor: null,
    highlightColor: null,
  });

  const canCreate = useMemo(
    () => title.trim().length > 0 || hasRichCommentContent(descriptionHtml) || images.length > 0,
    [title, descriptionHtml, images.length]
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const editor = editorRef.current;
    if (!editor) return;
    if (skipEditorSyncRef.current) {
      skipEditorSyncRef.current = false;
      return;
    }
    if (editor.innerHTML !== descriptionHtml) {
      editor.innerHTML = descriptionHtml;
    }
  }, [descriptionHtml, open]);

  useEffect(() => {
    if (!textPaletteOpen && !highlightPaletteOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const toolbar = toolbarRef.current;
      if (!toolbar) return;
      const target = event.target;
      if (target instanceof Node && toolbar.contains(target)) return;
      setTextPaletteOpen(false);
      setHighlightPaletteOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [highlightPaletteOpen, textPaletteOpen]);

  const ensureEditorSelection = (editor: HTMLDivElement) => {
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
  };

  const focusEditor = () => {
    const editor = editorRef.current;
    if (!editor) return null;
    editor.focus();
    return editor;
  };

  const updateActiveFormats = () => {
    const editor = editorRef.current;
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
  };

  useEffect(() => {
    if (!open) return;
    const onSelectionChange = () => updateActiveFormats();
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [open]);

  const syncFromEditor = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const normalized = normalizeRichCommentHtml(editor.innerHTML);
    skipEditorSyncRef.current = true;
    setDescriptionHtml(normalized);
  };

  const execEditorCommand = (command: string) => {
    const editor = focusEditor();
    if (!editor) return;
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(command, false);
    syncFromEditor();
    updateActiveFormats();
    setTextPaletteOpen(false);
    setHighlightPaletteOpen(false);
  };

  const applyColorCommand = (kind: 'text' | 'highlight', color: string) => {
    const normalized = normalizeColor(color);
    if (!normalized) return;
    const editor = focusEditor();
    if (!editor) return;
    const range = ensureEditorSelection(editor);
    if (kind === 'text') pendingTypingStyleRef.current.textColor = normalized;
    else pendingTypingStyleRef.current.highlightColor = normalized;

    const selection = window.getSelection();
    const hasSelectedText =
      !!selection &&
      !!range &&
      !range.collapsed &&
      (range.commonAncestorContainer === editor || editor.contains(range.commonAncestorContainer));

    if (hasSelectedText && range) {
      const wrapper = document.createElement('span');
      if (kind === 'text') wrapper.style.color = normalized;
      else wrapper.style.backgroundColor = normalized;

      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);

      if (selection) {
        const next = document.createRange();
        next.selectNodeContents(wrapper);
        selection.removeAllRanges();
        selection.addRange(next);
      }

      syncFromEditor();
      updateActiveFormats();
      setTextPaletteOpen(false);
      setHighlightPaletteOpen(false);
      return;
    }

    document.execCommand('styleWithCSS', false, 'true');
    if (kind === 'text') document.execCommand('foreColor', false, normalized);
    else {
      const ok = document.execCommand('hiliteColor', false, normalized);
      if (!ok) document.execCommand('backColor', false, normalized);
    }
    syncFromEditor();
    updateActiveFormats();
    setTextPaletteOpen(false);
    setHighlightPaletteOpen(false);
  };

  const clearColorSetting = (kind: 'text' | 'highlight') => {
    if (kind === 'text') pendingTypingStyleRef.current.textColor = null;
    else pendingTypingStyleRef.current.highlightColor = null;

    setActiveFormats((prev) => ({
      ...prev,
      textColor: kind === 'text' ? null : prev.textColor,
      highlightColor: kind === 'highlight' ? null : prev.highlightColor,
    }));

    const editor = focusEditor();
    if (editor) {
      ensureEditorSelection(editor);
      document.execCommand('styleWithCSS', false, 'true');
      if (kind === 'text') {
        document.execCommand('foreColor', false, '#0f172a');
      } else {
        const ok = document.execCommand('hiliteColor', false, '#ffffff');
        if (!ok) document.execCommand('backColor', false, '#ffffff');
      }
      syncFromEditor();
    }
    updateActiveFormats();
    setTextPaletteOpen(false);
    setHighlightPaletteOpen(false);
  };

  const openImagePicker = () => {
    const input = imageInputRef.current;
    if (!input) return;
    input.value = '';
    input.click();
  };

  const handleFilesPicked = async (files: FileList | File[] | null) => {
    const existing = sanitizeCardImages(images);
    const { images: nextImages, rejected, quotaExceeded, rateLimited } = await loadCardImagesFromFiles(files, existing);
    if (nextImages.length > 0) {
      setImages([...existing, ...nextImages]);
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

  const removeImage = (imageId: string) => {
    setImages((prev) => prev.filter((image) => image.id !== imageId));
  };

  const resetAndClose = () => {
    setTitle('');
    setDescriptionHtml('');
    setUrgency('white');
    setImages([]);
    setImagePreview(null);
    setImageError(null);
    setTextPaletteOpen(false);
    setHighlightPaletteOpen(false);
    pendingTypingStyleRef.current = { textColor: null, highlightColor: null };
    setActiveFormats({ bold: false, italic: false, strike: false, list: false, textColor: null, highlightColor: null });
    onClose();
  };

  const handleCreate = () => {
    const liveDescriptionHtml = normalizeRichCommentHtml(editorRef.current?.innerHTML ?? descriptionHtml);
    onCreate({
      title: title.trim(),
      description: liveDescriptionHtml,
      images: sanitizeCardImages(images),
      urgency,
    });
    resetAndClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) resetAndClose();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={motionProfile.modalBackdropTransition}
        >
          <motion.div
            className="modal modalCreate"
            onMouseDown={(e) => e.stopPropagation()}
            initial={motionProfile.modalSurfaceInitial}
            animate={motionProfile.modalSurfaceAnimate}
            exit={motionProfile.modalSurfaceExit}
            transition={motionProfile.modalSurfaceTransition}
          >
            <div className="modalHead">
              <h2 className="modalTitle">{t('modal.create.title')}</h2>
              <button className="iconMini" onClick={resetAndClose} title={t('common.close')} aria-label={t('common.close')}>
                ✕
              </button>
            </div>

            <div className="modalBody createBody">
              <div className="createField">
                <div className="label">{t('modal.create.titleLabel')}</div>
                <input
                  ref={titleRef}
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('modal.create.titlePlaceholder')}
                />
              </div>

              <div className="createField createTextField">
                <div className="label">{t('modal.create.textLabel')}</div>
                <div className="modalCommentComposer modalCommentComposerInline createCommentComposer">
                  <div className="modalCommentToolbar createCommentToolbar" ref={toolbarRef} onMouseDown={(event) => event.preventDefault()}>
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
                          {TEXT_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`modalCommentColorDot ${sameColor(activeFormats.textColor, color) ? 'isSelected' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => applyColorCommand('text', color)}
                              aria-label={`${t('modal.comments.toolbar.textColor')} ${color}`}
                              title={color}
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
                          {HIGHLIGHT_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`modalCommentColorDot modalCommentColorDotLight ${sameColor(activeFormats.highlightColor, color) ? 'isSelected' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => applyColorCommand('highlight', color)}
                              aria-label={`${t('modal.comments.toolbar.highlight')} ${color}`}
                              title={color}
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

                  <div
                    className="modalCommentInput modalCommentInputRich createRichEditor"
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline="true"
                    aria-label={t('modal.create.textLabel')}
                    data-placeholder={t('modal.create.textPlaceholder')}
                    data-empty={hasRichCommentContent(descriptionHtml) ? 'false' : 'true'}
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
                        setDescriptionHtml('');
                        updateActiveFormats();
                        return;
                      }
                      syncFromEditor();
                      updateActiveFormats();
                    }}
                    onFocus={() => updateActiveFormats()}
                    onBeforeInput={() => {
                      const editor = editorRef.current;
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
                        void handleFilesPicked(imageFiles);
                        return;
                      }
                      e.preventDefault();
                      const text = e.clipboardData.getData('text/plain');
                      document.execCommand('insertText', false, text);
                      updateActiveFormats();
                    }}
                  />

                  {images.length > 0 ? (
                    <div className="cardImagesRail cardImagesRailCreate" aria-label={t('modal.images.title')}>
                      {images.map((image) => (
                        <div key={image.id} className="cardImageThumbWrap cardImageThumbWrapCreate">
                          <button
                            type="button"
                            className="cardImageThumb cardImageThumbCreate"
                            onClick={() => setImagePreview(image)}
                            title={t('modal.images.preview')}
                            aria-label={t('modal.images.preview')}
                          >
                            <img src={getCardImagePreviewUrl(image)} alt={image.name || t('modal.images.item')} loading="lazy" />
                          </button>
                          <button
                            type="button"
                            className="cardImageRemoveBtn"
                            onClick={() => removeImage(image.id)}
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

              <div className="createField createUrgencyField">
                <div className="label">{t('modal.create.urgencyLabel')}</div>
                <div className="createUrgencyGrid" role="group" aria-label={t('modal.create.urgencyAria')}>
                  {URGENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className={`createUrgencyChip createUrgency_${opt.tone} ${urgency === opt.key ? 'createUrgencyChipActive' : ''}`}
                      onClick={() => setUrgency(opt.key)}
                    >
                      <span className="createUrgencyChipText">{t(opt.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modalFoot createFoot">
              <button className="btn" onClick={resetAndClose}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn cardImageActionBtn"
                onClick={openImagePicker}
                title={t('modal.images.add')}
                aria-label={t('modal.images.add')}
              >
                <ImageGlyph className="cardImageActionBtnIcon" />
              </button>
              <button className="btn btnPrimary" onClick={handleCreate} disabled={!canCreate}>
                {t('common.create')}
              </button>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="cardImageInputHidden"
              onChange={(event) => {
                void handleFilesPicked(event.target.files);
              }}
            />

            <AnimatePresence>
              {imagePreview ? (
                <motion.div
                  className="cardImagePreviewBackdrop"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setImagePreview(null);
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
                      onClick={() => setImagePreview(null)}
                      title={t('common.close')}
                      aria-label={t('common.close')}
                    >
                      ×
                    </button>
                    <img src={imagePreview.dataUrl} alt={imagePreview.name || t('modal.images.item')} className="cardImagePreviewFull" />
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
