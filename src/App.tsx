import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthMode } from './auth/AuthScreen';
import {
  ApiError,
  getAuthToken,
  getMe,
  loadRemoteBoard,
  login,
  logout,
  register,
  saveRemoteBoard,
  setAuthToken,
  updateProfile,
  type AuthUser,
  type ProfileUpdatePayload,
} from './auth/api';
import { clearLocalState, hydrateLocalState, loadState, type BoardState } from './board/storage';
import { useI18n } from './i18n';

const AuthScreen = lazy(() =>
  import('./auth/AuthScreen').then((mod) => ({
    default: mod.AuthScreen,
  }))
);

const Board = lazy(() =>
  import('./board/Board').then((mod) => ({
    default: mod.Board,
  }))
);

function authErrorText(error: unknown, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      return t('auth.error.serverUnavailable');
    }

    switch (error.code) {
      case 'INVALID_LOGIN':
        return t('auth.error.invalidLogin');
      case 'INVALID_EMAIL':
        return t('auth.error.invalidEmail');
      case 'WEAK_PASSWORD':
        return error.message || t('auth.error.weakPassword');
      case 'LOGIN_TAKEN':
        return t('auth.error.loginTaken');
      case 'EMAIL_TAKEN':
        return t('auth.error.emailTaken');
      case 'INVALID_CREDENTIALS':
        return t('auth.error.invalidCredentials');
      case 'UNAUTHORIZED':
        return t('auth.error.unauthorized');
      case 'BAD_JSON':
        return t('auth.error.badJson');
      default:
        return error.message || t('auth.error.request');
    }
  }
  return t('auth.error.fallback');
}

function mergeFloatingFromLocal(remote: BoardState, local: BoardState): BoardState {
  const nextFloating: BoardState['floatingById'] = { ...(remote.floatingById ?? {}) };
  const inColumn = (id: string) =>
    remote.columns.queue.includes(id) ||
    remote.columns.doing.includes(id) ||
    remote.columns.review.includes(id) ||
    remote.columns.done.includes(id);

  for (const [id, pin] of Object.entries(local.floatingById ?? {})) {
    if (!remote.cardsById[id]) continue;
    if (inColumn(id)) continue;
    if (nextFloating[id]) continue;
    nextFloating[id] = pin;
  }

  return { ...remote, floatingById: nextFloating };
}

function mergeFavoriteFlagsFromLocal(remote: BoardState, local: BoardState): BoardState {
  const remoteCards = remote.cardsById ?? {};
  const localCards = local.cardsById ?? {};
  const nextCards: BoardState['cardsById'] = { ...remoteCards };
  let changed = false;

  for (const [id, remoteCard] of Object.entries(remoteCards)) {
    const localCard = localCards[id];
    if (!localCard) continue;
    const localFavorite = Boolean(localCard.isFavorite);
    if (Boolean(remoteCard?.isFavorite) === localFavorite) continue;
    nextCards[id] = { ...remoteCard, isFavorite: localFavorite };
    changed = true;
  }

  return changed ? { ...remote, cardsById: nextCards } : remote;
}

function stateSnapshot(state: BoardState): string {
  try {
    return JSON.stringify(state);
  } catch {
    return '';
  }
}

export default function App() {
  const { t } = useI18n();

  const [booting, setBooting] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [boardEpoch, setBoardEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const token = getAuthToken();
      if (!token) {
        if (!cancelled) setBooting(false);
        return;
      }

      try {
        const localState = loadState();
        const me = await getMe(token);
        const remoteState = await loadRemoteBoard(token);
        const mergedState = mergeFloatingFromLocal(remoteState ?? localState, localState);
        const state = remoteState ? mergeFavoriteFlagsFromLocal(mergedState, localState) : mergedState;
        if (cancelled) return;

        hydrateLocalState(state);
        if (remoteState && stateSnapshot(remoteState) !== stateSnapshot(state)) {
          void saveRemoteBoard(state, token).catch(() => {
            // Keep local state; board sync loop will retry.
          });
        }
        setUser(me);
        setBoardEpoch((prev) => prev + 1);
      } catch {
        setAuthToken(null);
        clearLocalState();
      } finally {
        if (!cancelled) setBooting(false);
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const mapAuthError = useMemo(() => (error: unknown) => authErrorText(error, t), [t]);

  const handleAuthSubmit = useCallback(
    async (mode: AuthMode, payload: { login: string; email?: string; password: string }) => {
      setAuthLoading(true);
      setAuthError(null);

      let issuedToken: string | null = null;
      try {
        const authResponse =
          mode === 'login'
            ? await login(payload.login, payload.password)
            : await register(payload.login, payload.email ?? '', payload.password);

        issuedToken = authResponse.token;
        setAuthToken(authResponse.token);

        const localState = loadState();
        const remoteState = await loadRemoteBoard(authResponse.token);
        const mergedState = mergeFloatingFromLocal(remoteState ?? localState, localState);
        const state = remoteState ? mergeFavoriteFlagsFromLocal(mergedState, localState) : mergedState;
        hydrateLocalState(state);
        if (remoteState && stateSnapshot(remoteState) !== stateSnapshot(state)) {
          void saveRemoteBoard(state, authResponse.token).catch(() => {
            // Keep local state; board sync loop will retry.
          });
        }
        setUser(authResponse.user);
        setBoardEpoch((prev) => prev + 1);
      } catch (error) {
        if (issuedToken) setAuthToken(null);
        setAuthError(mapAuthError(error));
      } finally {
        setAuthLoading(false);
      }
    },
    [mapAuthError]
  );

  const handleLogout = useCallback(async () => {
    const token = getAuthToken();
    try {
      if (token) await logout(token);
    } catch {
      // Ignore logout API errors and still clear local session.
    }

    setAuthToken(null);
    clearLocalState();
    setAuthError(null);
    setUser(null);
    setBoardEpoch((prev) => prev + 1);
  }, []);

  const handleProfileSave = useCallback(
    async (payload: ProfileUpdatePayload) => {
      const token = getAuthToken();
      if (!token) {
        throw new ApiError('UNAUTHORIZED', 401, 'UNAUTHORIZED');
      }
      const nextUser = await updateProfile(payload, token);
      setUser(nextUser);
      return nextUser;
    },
    []
  );

  if (booting) {
    return (
      <div className="authPage">
        <div className="authCard authCardLoading">{t('boot.checkingSession')}</div>
      </div>
    );
  }

  const screenFallback = (
    <div className="authPage">
      <div className="authCard authCardLoading">{t('common.wait')}</div>
    </div>
  );

  if (!user) {
    return (
      <Suspense fallback={screenFallback}>
        <AuthScreen loading={authLoading} error={authError} onSubmit={handleAuthSubmit} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={screenFallback}>
      <Board key={`${user.id}-${boardEpoch}`} sessionUser={user} onLogout={handleLogout} onProfileSave={handleProfileSave} />
    </Suspense>
  );
}
