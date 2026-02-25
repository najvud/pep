import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEventHandler } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ApiError, type AuthUser, type ProfileUpdatePayload } from '../auth/api';
import { useI18n } from '../i18n';
import { useMotionProfile } from './useMotionProfile';

type Props = {
  open: boolean;
  user: AuthUser | null;
  onClose: () => void;
  onSave?: (payload: ProfileUpdatePayload) => Promise<AuthUser>;
  onLogout?: () => void | Promise<void>;
  createdTasksCount?: number;
  commentsCount?: number;
};

const MAX_PROFILE_AVATAR_BYTES = 700 * 1024;
const MAX_AVATAR_SIDE = 480;
const AVATAR_JPEG_QUALITY = 0.86;
const PROFILE_ABOUT_MAX_LEN = 150;
const PROFILE_FIRST_NAME_MAX_LEN = 48;
const PROFILE_LAST_NAME_MAX_LEN = 48;
const PROFILE_ROLE_MAX_LEN = 64;
const PROFILE_CITY_MAX_LEN = 64;
const PROFILE_MIN_AGE_YEARS = 16;
const PROFILE_LOGIN_RX = /^[A-Za-zА-Яа-яЁё]{2,32}$/u;
const PROFILE_NAME_RX = /^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё' -]{1,47}$/u;
const PROFILE_ROLE_RX = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 .,#/&()+-]{1,63}$/u;
const PROFILE_CITY_RX = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9' .-]{1,63}$/u;

const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const DATA_URL_BASE64_RX = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    image.src = dataUrl;
  });
}

function normalizeImageMime(raw: string): string {
  const mime = String(raw ?? '').trim().toLowerCase();
  if (mime === 'image/jpg') return 'image/jpeg';
  return mime;
}

function dataUrlBytes(dataUrl: string): number {
  const match = DATA_URL_BASE64_RX.exec(String(dataUrl ?? '').trim());
  if (!match) return 0;
  const base64 = String(match[2] ?? '').replace(/\s+/g, '');
  if (!base64) return 0;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

async function prepareAvatarDataUrl(file: File): Promise<string> {
  const mime = normalizeImageMime(file.type);
  if (!ALLOWED_IMAGE_MIME.has(mime)) throw new Error('UNSUPPORTED_TYPE');

  const raw = await readFileAsDataUrl(file);
  if (!raw.startsWith('data:image/')) throw new Error('INVALID_IMAGE');

  if (mime === 'image/gif') return raw;

  const img = await loadImage(raw);
  const width = Number(img.naturalWidth || 0);
  const height = Number(img.naturalHeight || 0);
  if (width <= 0 || height <= 0) throw new Error('INVALID_IMAGE');

  const scale = Math.min(1, MAX_AVATAR_SIDE / Math.max(width, height));
  if (scale === 1 && dataUrlBytes(raw) <= MAX_PROFILE_AVATAR_BYTES) return raw;

  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('CANVAS_FAILED');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const outputMime = mime === 'image/png' ? 'image/png' : 'image/jpeg';
  const optimized =
    outputMime === 'image/jpeg'
      ? canvas.toDataURL(outputMime, AVATAR_JPEG_QUALITY)
      : canvas.toDataURL(outputMime);
  return optimized;
}

function toNullableText(value: string): string | null {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function profileErrorText(error: unknown, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (!(error instanceof ApiError)) return t('profile.error.save');
  if (error.code === 'LOGIN_TAKEN') return t('profile.error.loginTaken');
  if (error.code === 'INVALID_LOGIN') return t('profile.error.invalidLogin');
  if (error.code === 'INVALID_BIRTH_DATE' || error.code === 'INVALID_PROFILE_BIRTH_DATE') {
    return t('profile.error.invalidBirthDate');
  }
  if (error.code === 'INVALID_PROFILE_FIRST_NAME') return t('profile.error.invalidFirstName');
  if (error.code === 'INVALID_PROFILE_LAST_NAME') return t('profile.error.invalidLastName');
  if (error.code === 'INVALID_PROFILE_ROLE') return t('profile.error.invalidRole');
  if (error.code === 'INVALID_PROFILE_CITY') return t('profile.error.invalidCity');
  if (error.code === 'INVALID_PROFILE_ABOUT') return t('profile.error.invalidAbout');
  if (error.code === 'INVALID_AVATAR' || error.code === 'INVALID_PROFILE_AVATAR') {
    return t('profile.error.avatarInvalid');
  }
  return error.message || t('profile.error.save');
}

function profileRoleText(value: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const text = String(value ?? '').trim();
  return text || t('profile.role.empty');
}

function isoDateYearsAgo(years: number): string {
  const now = new Date();
  const y = now.getFullYear() - years;
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function isBirthDateAtLeastAge(raw: string, minAgeYears: number): boolean {
  const value = String(raw ?? '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;

  const now = new Date();
  let age = now.getFullYear() - y;
  const hasBirthdayPassed =
    now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  if (!hasBirthdayPassed) age -= 1;
  return age >= minAgeYears;
}

type ProfileFieldErrorKey =
  | 'profile.error.invalidLogin'
  | 'profile.error.invalidFirstName'
  | 'profile.error.invalidLastName'
  | 'profile.error.invalidBirthDate'
  | 'profile.error.invalidRole'
  | 'profile.error.invalidCity'
  | 'profile.error.invalidAbout'
  | null;

type ProfileField = 'login' | 'firstName' | 'lastName' | 'birthDate' | 'role' | 'city' | 'about';

type ProfileFieldErrors = Partial<Record<ProfileField, ProfileFieldErrorKey>>;

function validateProfileDraft(input: {
  login: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  role: string;
  city: string;
  about: string;
}): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const login = String(input.login ?? '').trim();
  if (!PROFILE_LOGIN_RX.test(login)) errors.login = 'profile.error.invalidLogin';

  const firstName = String(input.firstName ?? '').trim();
  if (firstName && !PROFILE_NAME_RX.test(firstName)) errors.firstName = 'profile.error.invalidFirstName';

  const lastName = String(input.lastName ?? '').trim();
  if (lastName && !PROFILE_NAME_RX.test(lastName)) errors.lastName = 'profile.error.invalidLastName';

  const birthDate = String(input.birthDate ?? '').trim();
  if (birthDate && !isBirthDateAtLeastAge(birthDate, PROFILE_MIN_AGE_YEARS)) {
    errors.birthDate = 'profile.error.invalidBirthDate';
  }

  const role = String(input.role ?? '').trim();
  if (role && !PROFILE_ROLE_RX.test(role)) errors.role = 'profile.error.invalidRole';

  const city = String(input.city ?? '').trim();
  if (city && !PROFILE_CITY_RX.test(city)) errors.city = 'profile.error.invalidCity';

  const about = String(input.about ?? '');
  if (about.length > PROFILE_ABOUT_MAX_LEN) errors.about = 'profile.error.invalidAbout';

  return errors;
}

export function ProfileModal({
  open,
  user,
  onClose,
  onSave,
  onLogout,
  createdTasksCount = 0,
  commentsCount = 0,
}: Props) {
  const { t } = useI18n();
  const motionProfile = useMotionProfile();

  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [role, setRole] = useState('');
  const [city, setCity] = useState('');
  const [about, setAbout] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [fieldTouched, setFieldTouched] = useState<Partial<Record<ProfileField, boolean>>>({});
  const [serverFieldErrors, setServerFieldErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const [saveNoticeVisible, setSaveNoticeVisible] = useState(false);
  const [avatarDragActive, setAvatarDragActive] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({
    identity: true,
    details: true,
    about: true,
  });

  const loginRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const avatarFallback = useMemo(() => {
    const source = login.trim() || user?.login?.trim() || '?';
    return source.charAt(0).toUpperCase();
  }, [login, user?.login]);

  const fillDraftFromUser = useCallback((source: AuthUser) => {
    setLogin(String(source.login ?? ''));
    setEmail(String(source.email ?? ''));
    setFirstName(String(source.firstName ?? '').slice(0, PROFILE_FIRST_NAME_MAX_LEN));
    setLastName(String(source.lastName ?? '').slice(0, PROFILE_LAST_NAME_MAX_LEN));
    setBirthDate(String(source.birthDate ?? ''));
    setRole(String(source.role ?? '').slice(0, PROFILE_ROLE_MAX_LEN));
    setCity(String(source.city ?? '').slice(0, PROFILE_CITY_MAX_LEN));
    setAbout(String(source.about ?? '').slice(0, PROFILE_ABOUT_MAX_LEN));
    setAvatarUrl(source.avatarUrl ? String(source.avatarUrl) : null);
  }, []);

  const safeCreatedTasksCount = useMemo(() => {
    const count = Number(createdTasksCount);
    if (!Number.isFinite(count) || count <= 0) return 0;
    return Math.trunc(count);
  }, [createdTasksCount]);
  const safeCommentsCount = useMemo(() => {
    const count = Number(commentsCount);
    if (!Number.isFinite(count) || count <= 0) return 0;
    return Math.trunc(count);
  }, [commentsCount]);
  const sheetTransition = motionProfile.reducedMotion
    ? { duration: 0.01 }
    : { duration: 1.08, ease: [0.22, 0.61, 0.36, 1] as const };
  const clientFieldErrors = useMemo(() => {
    return validateProfileDraft({
      login,
      firstName,
      lastName,
      birthDate,
      role,
      city,
      about,
    });
  }, [about, birthDate, city, firstName, lastName, login, role]);

  const birthDateMax = useMemo(() => isoDateYearsAgo(PROFILE_MIN_AGE_YEARS), []);
  const clearValidationState = useCallback(() => {
    setSubmitAttempted(false);
    setFieldTouched({});
    setServerFieldErrors({});
    setFormError(null);
  }, []);
  const fieldErrorText = useCallback(
    (field: ProfileField): string | null => {
      const serverError = serverFieldErrors[field];
      if (serverError) return serverError;
      if (!(submitAttempted || fieldTouched[field])) return null;
      const clientErrorKey = clientFieldErrors[field];
      return clientErrorKey ? t(clientErrorKey) : null;
    },
    [clientFieldErrors, fieldTouched, serverFieldErrors, submitAttempted, t]
  );
  const markFieldTouched = useCallback((field: ProfileField) => {
    setFieldTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);
  const clearServerFieldError = useCallback((field: ProfileField) => {
    setServerFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    fillDraftFromUser(user);
    setSaving(false);
    setIsEditing(false);
    clearValidationState();
    setAvatarDragActive(false);
    setSaveNoticeVisible(false);
    setSectionOpen({ identity: true, details: true, about: true });
  }, [clearValidationState, fillDraftFromUser, open, user]);

  useEffect(() => {
    if (!saveNoticeVisible) return;
    const timer = window.setTimeout(() => setSaveNoticeVisible(false), 1800);
    return () => window.clearTimeout(timer);
  }, [saveNoticeVisible]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('.subAccountTrigger')) return;
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onClose]);

  const applyAvatarFile = useCallback(
    async (file: File) => {
      if (!isEditing) return;
      setFormError(null);
      setSaveNoticeVisible(false);
      try {
        const dataUrl = await prepareAvatarDataUrl(file);
        const bytes = dataUrlBytes(dataUrl);
        if (bytes <= 0 || bytes > MAX_PROFILE_AVATAR_BYTES) {
          setFormError(t('profile.error.avatarTooLarge'));
          return;
        }
        setAvatarUrl(dataUrl);
      } catch {
        setFormError(t('profile.error.avatarInvalid'));
      }
    },
    [isEditing, t]
  );

  const handleAvatarFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await applyAvatarFile(file);
  };

  const handleAvatarDrop: DragEventHandler<HTMLDivElement> = async (event) => {
    if (!isEditing) return;
    event.preventDefault();
    event.stopPropagation();
    setAvatarDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await applyAvatarFile(file);
  };
  const switchEditMode = useCallback(
    (next: boolean) => {
      if (!onSave || saving || !user) return;
      if (next) {
        clearValidationState();
        setSaveNoticeVisible(false);
        setIsEditing(true);
        return;
      }
      fillDraftFromUser(user);
      setSaving(false);
      setIsEditing(false);
      clearValidationState();
      setAvatarDragActive(false);
    },
    [clearValidationState, fillDraftFromUser, onSave, saving, user]
  );
  const toggleSection = useCallback((key: 'identity' | 'details' | 'about') => {
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = async () => {
    if (!user || !onSave || saving || !isEditing) return;
    setSubmitAttempted(true);

    const normalizedLogin = String(login ?? '').trim();
    const hasClientErrors = Object.values(clientFieldErrors).some((value) => Boolean(value));
    if (hasClientErrors || !normalizedLogin) {
      return;
    }

    setSaving(true);
    setFormError(null);
    setServerFieldErrors({});
    try {
      await onSave({
        login: normalizedLogin,
        avatarUrl: toNullableText(avatarUrl ?? ''),
        firstName: toNullableText(firstName),
        lastName: toNullableText(lastName),
        birthDate: toNullableText(birthDate),
        role: toNullableText(role),
        city: toNullableText(city),
        about: toNullableText(about),
      });
      clearValidationState();
      setIsEditing(false);
      setSaveNoticeVisible(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'LOGIN_TAKEN') {
        setServerFieldErrors({ login: t('profile.error.loginTaken') });
      } else {
        setFormError(profileErrorText(err, t));
      }
    } finally {
      setSaving(false);
    }
  };

  const loginErrorText = fieldErrorText('login');
  const firstNameErrorText = fieldErrorText('firstName');
  const lastNameErrorText = fieldErrorText('lastName');
  const birthDateErrorText = fieldErrorText('birthDate');
  const roleErrorText = fieldErrorText('role');
  const cityErrorText = fieldErrorText('city');
  const aboutErrorText = fieldErrorText('about');

  if (!user) return null;

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.section
          className="profileSheetRoot"
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget) return;
            onClose();
          }}
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          transition={{ duration: 0.01 }}
        >
          <motion.div
            ref={panelRef}
            className={`modal profileModal profileSheetPanel ${isEditing ? 'isEditing' : 'isView'}`}
            role="dialog"
            aria-modal="true"
            aria-label={t('profile.title')}
            style={{
              willChange: 'transform',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '-100%' }}
            transition={sheetTransition}
          >
            <div className="modalHead profileModalHead">
              <div className="profileHeadTitle">
                <h3 className="modalTitle">{t('profile.title')}</h3>
                <span
                  className={`profileSavedBadge ${saveNoticeVisible ? 'isVisible' : ''}`}
                  aria-live="polite"
                >
                  {t('profile.saved')}
                </span>
              </div>
              <div className="modalActions profileHeadActions">
                <div className="profileModeSwitch" role="tablist" aria-label={t('profile.mode.switch')}>
                  <button
                    type="button"
                    className={`profileModeBtn ${!isEditing ? 'isActive' : ''}`}
                    role="tab"
                    aria-selected={!isEditing}
                    onClick={() => switchEditMode(false)}
                    disabled={saving}
                  >
                    {t('profile.mode.view')}
                  </button>
                  <button
                    type="button"
                    className={`profileModeBtn ${isEditing ? 'isActive' : ''}`}
                    role="tab"
                    aria-selected={isEditing}
                    onClick={() => switchEditMode(true)}
                    disabled={!onSave || saving}
                  >
                    {t('profile.mode.edit')}
                  </button>
                </div>
              </div>
            </div>

            <div className="modalBody profileModalBody">
              <div className="profileGrid">
                <div className="profileAvatarCard">
                  <div className="profileAvatarMain">
                    <div
                      className={`profileAvatarPreview ${avatarUrl ? 'hasImage' : ''} ${avatarDragActive ? 'isDragActive' : ''}`}
                      onDragOver={(event) => {
                        if (!isEditing) return;
                        event.preventDefault();
                        event.stopPropagation();
                        setAvatarDragActive(true);
                      }}
                      onDragLeave={(event) => {
                        if (!isEditing) return;
                        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                        setAvatarDragActive(false);
                      }}
                      onDrop={handleAvatarDrop}
                    >
                      {avatarUrl ? <img src={avatarUrl} alt="" loading="lazy" /> : <span>{avatarFallback}</span>}
                      {isEditing ? (
                        <div className={`profileAvatarOverlayActions ${avatarUrl ? '' : 'isSingle'}`}>
                          <button
                            type="button"
                            className="profileAvatarOverlayBtn profileAvatarOverlayBtnUpload"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={saving}
                            title={t('profile.avatar.upload')}
                            aria-label={t('profile.avatar.upload')}
                          >
                            {t('profile.avatar.upload')}
                          </button>
                          {avatarUrl ? (
                            <button
                              type="button"
                              className="profileAvatarOverlayBtn profileAvatarOverlayBtnRemove"
                              onClick={() => setAvatarUrl(null)}
                              disabled={saving}
                              title={t('profile.avatar.remove')}
                              aria-label={t('profile.avatar.remove')}
                            >
                              {t('profile.avatar.remove')}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className={`profileAvatarMeta ${isEditing ? 'isEditing' : ''}`}>
                      {isEditing ? (
                        <label className="profileRoleField">
                          <div className="label">{t('profile.role')}</div>
                          <input
                            className="input profileRoleInput"
                            value={role}
                            onChange={(event) => {
                              setRole(event.target.value.slice(0, PROFILE_ROLE_MAX_LEN));
                              clearServerFieldError('role');
                            }}
                            onBlur={() => markFieldTouched('role')}
                            placeholder={t('profile.placeholder.role')}
                            disabled={saving}
                            maxLength={PROFILE_ROLE_MAX_LEN}
                          />
                          {roleErrorText ? <span className="profileInlineError">{roleErrorText}</span> : null}
                        </label>
                      ) : (
                        <div className="profileRoleViewRow" title={t('profile.role')}>
                          <span className="profileRoleViewText">{profileRoleText(role, t)}</span>
                        </div>
                      )}

                      {!isEditing ? (
                        <div className="profileStatsGrid">
                          <div className="profileTasksStat" title={t('profile.tasksCreated')}>
                            <span className="profileTasksStatLabel">{t('profile.tasksCreated')}</span>
                            <span className="profileTasksStatValue">{safeCreatedTasksCount}</span>
                          </div>
                          <div className="profileTasksStat" title={t('profile.commentsTotal')}>
                            <span className="profileTasksStatLabel">{t('profile.commentsTotal')}</span>
                            <span className="profileTasksStatValue">{safeCommentsCount}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="profileAvatarFooter profileAvatarFooterEdit">
                      <div className="profileAvatarFooterActions">
                        <button
                          type="button"
                          className="btn btnPrimary profileActionBtn profileActionBtnPrimary"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          {saving ? t('common.wait') : t('profile.save')}
                        </button>
                      </div>
                    </div>
                  ) : onLogout ? (
                    <div className="profileAvatarFooter">
                      <button
                        type="button"
                        className="btn profileLogoutBtn"
                        onClick={() => {
                          onClose();
                          void onLogout();
                        }}
                        title={t('board.logout')}
                        aria-label={t('board.logout')}
                      >
                        {t('board.logout')}
                      </button>
                    </div>
                  ) : (
                    <div className="profileAvatarFooter profileAvatarFooterGhost" aria-hidden="true" />
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleAvatarFile}
                  />
                </div>

                <div className="profileFieldsCol">
                  <div className="profileFieldsScroll">
                    <section className={`profileSection ${sectionOpen.identity ? 'isOpen' : ''}`}>
                      <button type="button" className="profileSectionToggle" onClick={() => toggleSection('identity')}>
                        {t('profile.section.identity')}
                      </button>
                      <div className="profileSectionContent">
                        <div className="profileFields profileFieldsSection">
                          <div className="profileFieldsRow profileIdentityRow">
                            <label className="profileField">
                              <div className="label">{t('profile.login')}</div>
                              <input
                                ref={loginRef}
                                className="input"
                                value={login}
                                onChange={(event) => {
                                  setLogin(event.target.value);
                                  clearServerFieldError('login');
                                }}
                                onBlur={() => markFieldTouched('login')}
                                placeholder={t('auth.placeholder.login')}
                                disabled={!isEditing || saving}
                                maxLength={32}
                              />
                              {loginErrorText ? <span className="profileInlineError">{loginErrorText}</span> : null}
                            </label>

                            <label className="profileField">
                              <div className="label">{t('profile.email')}</div>
                              <input
                                className="input"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                disabled
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className={`profileSection ${sectionOpen.details ? 'isOpen' : ''}`}>
                      <button type="button" className="profileSectionToggle" onClick={() => toggleSection('details')}>
                        {t('profile.section.details')}
                      </button>
                      <div className="profileSectionContent">
                        <div className="profileFields profileFieldsSection">
                          <div className="profileFieldsRow">
                            <label className="profileField">
                              <div className="label">{t('profile.firstName')}</div>
                              <input
                                className="input"
                                value={firstName}
                                onChange={(event) => {
                                  setFirstName(event.target.value.slice(0, PROFILE_FIRST_NAME_MAX_LEN));
                                  clearServerFieldError('firstName');
                                }}
                                onBlur={() => markFieldTouched('firstName')}
                                placeholder={t('profile.placeholder.firstName')}
                                disabled={!isEditing || saving}
                                maxLength={PROFILE_FIRST_NAME_MAX_LEN}
                              />
                              {firstNameErrorText ? <span className="profileInlineError">{firstNameErrorText}</span> : null}
                            </label>
                            <label className="profileField">
                              <div className="label">{t('profile.lastName')}</div>
                              <input
                                className="input"
                                value={lastName}
                                onChange={(event) => {
                                  setLastName(event.target.value.slice(0, PROFILE_LAST_NAME_MAX_LEN));
                                  clearServerFieldError('lastName');
                                }}
                                onBlur={() => markFieldTouched('lastName')}
                                placeholder={t('profile.placeholder.lastName')}
                                disabled={!isEditing || saving}
                                maxLength={PROFILE_LAST_NAME_MAX_LEN}
                              />
                              {lastNameErrorText ? <span className="profileInlineError">{lastNameErrorText}</span> : null}
                            </label>
                          </div>

                          <div className="profileFieldsRow">
                            <label className="profileField">
                              <div className="label">{t('profile.birthDate')}</div>
                              <input
                                type="date"
                                className="input"
                                value={birthDate}
                                onChange={(event) => {
                                  setBirthDate(event.target.value);
                                  clearServerFieldError('birthDate');
                                }}
                                onBlur={() => markFieldTouched('birthDate')}
                                disabled={!isEditing || saving}
                                max={birthDateMax}
                                min="1900-01-01"
                              />
                              {birthDateErrorText ? <span className="profileInlineError">{birthDateErrorText}</span> : null}
                            </label>
                            <label className="profileField">
                              <div className="label">{t('profile.city')}</div>
                              <input
                                className="input"
                                value={city}
                                onChange={(event) => {
                                  setCity(event.target.value.slice(0, PROFILE_CITY_MAX_LEN));
                                  clearServerFieldError('city');
                                }}
                                onBlur={() => markFieldTouched('city')}
                                placeholder={t('profile.placeholder.city')}
                                disabled={!isEditing || saving}
                                maxLength={PROFILE_CITY_MAX_LEN}
                              />
                              {cityErrorText ? <span className="profileInlineError">{cityErrorText}</span> : null}
                            </label>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className={`profileSection ${sectionOpen.about ? 'isOpen' : ''}`}>
                      <button type="button" className="profileSectionToggle" onClick={() => toggleSection('about')}>
                        {t('profile.section.about')}
                      </button>
                      <div className="profileSectionContent">
                        <div className="profileFields profileFieldsSection">
                          <label className="profileAboutField profileField">
                            <div className="profileAboutHead">
                              <div className="label">{t('profile.about')}</div>
                              <span
                                className={`profileAboutCounter ${about.length >= PROFILE_ABOUT_MAX_LEN ? 'isLimit' : ''}`}
                                aria-live="polite"
                              >
                                {about.length}/{PROFILE_ABOUT_MAX_LEN}
                              </span>
                            </div>
                            <textarea
                              className="textarea profileAboutInput"
                              value={about}
                              onChange={(event) => {
                                setAbout(event.target.value.slice(0, PROFILE_ABOUT_MAX_LEN));
                                clearServerFieldError('about');
                              }}
                              onBlur={() => markFieldTouched('about')}
                              placeholder={t('profile.placeholder.about')}
                              disabled={!isEditing || saving}
                              maxLength={PROFILE_ABOUT_MAX_LEN}
                            />
                            {aboutErrorText ? <span className="profileInlineError">{aboutErrorText}</span> : null}
                          </label>
                        </div>
                      </div>
                    </section>
                    {formError ? <div className="profileError">{formError}</div> : null}
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
