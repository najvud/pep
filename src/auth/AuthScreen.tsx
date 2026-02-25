import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { animate, motion, useAnimationFrame, useMotionValue, useReducedMotion } from 'framer-motion';
import { useI18n } from '../i18n';
import { LanguageToggle } from '../i18n/LanguageToggle';

export type AuthMode = 'login' | 'register';

type SubmitPayload = {
  login: string;
  email?: string;
  password: string;
};

type Props = {
  loading: boolean;
  error: string | null;
  onSubmit: (mode: AuthMode, payload: SubmitPayload) => Promise<void> | void;
};

function EyeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M2.8 12c1.95-3.45 5.4-5.6 9.2-5.6s7.25 2.15 9.2 5.6c-1.95 3.45-5.4 5.6-9.2 5.6S4.75 15.45 2.8 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function EyeOffGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M2.8 12c1.95-3.45 5.4-5.6 9.2-5.6 1.9 0 3.68.54 5.2 1.5M21.2 12c-.82 1.44-1.95 2.65-3.27 3.56A9.73 9.73 0 0 1 12 17.6c-3.8 0-7.25-2.15-9.2-5.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 4 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

type DemoUrgency = 'white' | 'yellow' | 'pink' | 'red';
type AuthNailTone = 'slate' | 'sage' | 'amber' | 'violet' | 'rose';

type DemoCard = {
  id: string;
  title: string;
  description: string;
  urgency: DemoUrgency;
  timer?: string;
  left: string;
  top: string;
  rotate: number;
  swayRange: number;
  swayDuration: number;
  swayDelay: number;
};

type AuthDemoCardProps = {
  card: DemoCard;
  dragConstraints: RefObject<HTMLDivElement | null>;
};

const AUTH_DEMO_CARDS: DemoCard[] = [
  {
    id: 'P-21',
    title: 'Причесать UI логина',
    description: 'Сверить сетку и ритм отступов перед релизом.',
    urgency: 'yellow',
    left: '6%',
    top: '12%',
    rotate: -2.5,
    swayRange: 1.2,
    swayDuration: 3.2,
    swayDelay: 0.1,
  },
  {
    id: 'P-34',
    title: 'Проверить таймеры',
    description: 'Убедиться, что в "Делаем" формат чч:мм:сс стабилен.',
    urgency: 'pink',
    timer: '00:18:42',
    left: '74%',
    top: '20%',
    rotate: 1.8,
    swayRange: 1.5,
    swayDuration: 3.8,
    swayDelay: 0.45,
  },
  {
    id: 'P-43',
    title: 'Добить адаптив',
    description: 'Проверить поиск/фильтры на узких разрешениях.',
    urgency: 'red',
    left: '68%',
    top: '68%',
    rotate: -1.2,
    swayRange: 1.35,
    swayDuration: 3.45,
    swayDelay: 0.25,
  },
];

const AUTH_NAIL_TONES: AuthNailTone[] = ['slate', 'sage', 'amber', 'violet', 'rose'];

function authNailToneFromCardId(cardId: string): AuthNailTone {
  const id = String(cardId ?? '');
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % 997;
  }
  return AUTH_NAIL_TONES[hash % AUTH_NAIL_TONES.length];
}

const SPIN_DURATION_S = 0.86;

function AuthDemoCard({ card, dragConstraints }: AuthDemoCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const nailTone = useMemo(() => authNailToneFromCardId(card.id), [card.id]);
  const rotate = useMotionValue(card.rotate);
  const spinOffset = useMotionValue(0);
  const draggingRef = useRef(false);
  const spinControlsRef = useRef<{ stop: () => void } | null>(null);

  const startSpin = useCallback(() => {
    if (prefersReducedMotion || draggingRef.current) return;
    spinControlsRef.current?.stop();
    spinOffset.set(0);
    spinControlsRef.current = animate(spinOffset, [0, 360], {
      duration: SPIN_DURATION_S,
      ease: [0.22, 1, 0.36, 1],
    });
  }, [prefersReducedMotion, spinOffset]);

  useEffect(
    () => () => {
      spinControlsRef.current?.stop();
      spinControlsRef.current = null;
    },
    []
  );

  useAnimationFrame((timeMs) => {
    if (prefersReducedMotion) {
      rotate.set(card.rotate);
      spinControlsRef.current?.stop();
      spinControlsRef.current = null;
      spinOffset.set(0);
      return;
    }

    if (draggingRef.current) {
      rotate.set(0);
      spinControlsRef.current?.stop();
      spinControlsRef.current = null;
      spinOffset.set(0);
      return;
    }

    const omega = (Math.PI * 2) / card.swayDuration;
    const phase = (timeMs / 1000) * omega + card.swayDelay * Math.PI * 2;
    const swayAngle = card.rotate + Math.sin(phase) * card.swayRange;
    rotate.set(swayAngle + spinOffset.get());
  });

  return (
    <motion.article
      className="authFloatCard"
      data-u={card.urgency}
      data-nail-tone={nailTone}
      style={{ left: card.left, top: card.top }}
      drag
      dragConstraints={dragConstraints}
      dragElastic={0.12}
      dragMomentum={false}
      onTap={startSpin}
      onDragStart={() => {
        draggingRef.current = true;
      }}
      onDragEnd={() => {
        draggingRef.current = false;
      }}
      whileDrag={{
        scale: 1.03,
        zIndex: 12,
        cursor: 'grabbing',
      }}
    >
      <span className="floatingHangNailStandalone" aria-hidden="true">
        <span className="floatingHangNailHead" />
        <span className="floatingHangNailBody" />
        <span className="floatingHangNailBase" />
        <span className="floatingHangNailNeedle" />
      </span>
      <motion.div className="floatingCardRig" style={{ rotate }}>
        <div className="floatingHangRopesStandalone" aria-hidden="true">
          <span className="floatingHangRopeStandalone floatingHangRopeStandaloneLeft" />
          <span className="floatingHangRopeStandalone floatingHangRopeStandaloneRight" />
        </div>
        <div className="authFloatCardInner">
          <div className="floatingHangDecor" aria-hidden="true">
            <span className="floatingHangAnchor floatingHangAnchorLeft" />
            <span className="floatingHangAnchor floatingHangAnchorRight" />
          </div>
          <div className="urgBar" />
          <div className="cardMeta">
            <span className="cardId">{card.id}</span>
            {card.timer ? (
              <span className="cardTimer">
                <span className="cardTimerIcon" aria-hidden="true">
                  ⏱
                </span>
                <span className="cardTimerText">{card.timer}</span>
              </span>
            ) : null}
          </div>
          <p className="cardTitle">{card.title}</p>
          <p className="cardDesc">{card.description}</p>
        </div>
      </motion.div>
    </motion.article>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidLogin(value: string) {
  if (value.length < 2 || value.length > 32) return false;
  return /^[A-Za-zА-Яа-яЁё]+$/u.test(value);
}

export function AuthScreen({ loading, error, onSubmit }: Props) {
  const { t } = useI18n();
  const demoCanvasRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<AuthMode>('login');
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginNormalized = login.trim();
  const emailNormalized = email.trim();

  const loginOk = isValidLogin(loginNormalized);
  const emailOk = mode === 'login' || isValidEmail(emailNormalized);
  const passwordOk = password.length >= 6;
  const confirmOk = mode === 'login' || password === confirm;

  const canSubmit = useMemo(
    () => !loading && loginOk && emailOk && passwordOk && confirmOk,
    [loading, loginOk, emailOk, passwordOk, confirmOk]
  );

  return (
    <div className="authPage">
      <div className="authDemoCanvas" ref={demoCanvasRef} aria-hidden="true">
        {AUTH_DEMO_CARDS.map((card) => (
          <AuthDemoCard key={card.id} card={card} dragConstraints={demoCanvasRef} />
        ))}
      </div>

      <div className="authCard">
        <div className="authHead">
          <div className="authHeadTop">
            <h1 className="authTitle authBrand">
              <img className="authBrandMark" src="/planorama-mark.svg" alt="" aria-hidden="true" />
              <span>{t('app.name')}</span>
            </h1>
            <LanguageToggle />
          </div>
          <p className="authSubtitle">{t('auth.subtitle')}</p>
        </div>

        <div className="authTabs" role="tablist" aria-label={t('auth.mode.aria')}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`authTab ${mode === 'login' ? 'authTabActive' : ''}`}
            onClick={() => {
              setMode('login');
              setShowPassword(false);
              setShowConfirmPassword(false);
            }}
          >
            {t('auth.tab.login')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`authTab ${mode === 'register' ? 'authTabActive' : ''}`}
            onClick={() => {
              setMode('register');
              setShowPassword(false);
              setShowConfirmPassword(false);
            }}
          >
            {t('auth.tab.register')}
          </button>
        </div>

        <form
          className="authForm"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canSubmit) return;
            await onSubmit(
              mode,
              mode === 'login'
                ? { login: loginNormalized, password }
                : { login: loginNormalized, email: emailNormalized, password }
            );
          }}
        >
          <label className="authField">
            <span className="authLabel">{t('auth.label.login')}</span>
            <input
              className="authInput"
              type="text"
              autoComplete="username"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder={t('auth.placeholder.login')}
              disabled={loading}
            />
          </label>

          {mode === 'register' ? (
            <label className="authField">
              <span className="authLabel">{t('auth.label.email')}</span>
              <input
                className="authInput"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('auth.placeholder.email')}
                disabled={loading}
              />
            </label>
          ) : null}

          <label className="authField">
            <span className="authLabel">{t('auth.label.password')}</span>
            <div className="authPasswordWrap">
              <input
                className="authInput authInputPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('auth.placeholder.password')}
                disabled={loading}
              />
              <button
                type="button"
                className="authPasswordToggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? t('auth.password.hide') : t('auth.password.show')}
                title={showPassword ? t('auth.password.hide') : t('auth.password.show')}
                disabled={loading}
              >
                {showPassword ? <EyeOffGlyph className="authPasswordIcon" /> : <EyeGlyph className="authPasswordIcon" />}
              </button>
            </div>
          </label>

          {mode === 'register' ? (
            <label className="authField">
              <span className="authLabel">{t('auth.label.confirm')}</span>
              <div className="authPasswordWrap">
                <input
                  className="authInput authInputPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder={t('auth.placeholder.confirm')}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="authPasswordToggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? t('auth.password.hide') : t('auth.password.show')}
                  title={showConfirmPassword ? t('auth.password.hide') : t('auth.password.show')}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOffGlyph className="authPasswordIcon" />
                  ) : (
                    <EyeGlyph className="authPasswordIcon" />
                  )}
                </button>
              </div>
            </label>
          ) : null}

          {!loginOk && loginNormalized ? <div className="authHint">{t('auth.hint.invalidLogin')}</div> : null}
          {!emailOk && mode === 'register' && emailNormalized ? (
            <div className="authHint">{t('auth.hint.invalidEmail')}</div>
          ) : null}
          {!passwordOk && password ? <div className="authHint">{t('auth.hint.weakPassword')}</div> : null}
          {mode === 'register' && confirm && !confirmOk ? <div className="authHint">{t('auth.hint.passwordMismatch')}</div> : null}
          {error ? <div className="authError">{error}</div> : null}

          <button type="submit" className="authSubmit" disabled={!canSubmit}>
            {loading ? t('common.wait') : mode === 'login' ? t('auth.submit.login') : t('auth.submit.register')}
          </button>
          {mode === 'login' ? <p className="authCopyright">{t('auth.copyright')}</p> : null}
        </form>
      </div>
    </div>
  );
}

