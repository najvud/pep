import { useEffect, useRef } from 'react';
import type { BoardState } from './types';
import { saveState } from './storage';

export function useDebouncedPersist(board: BoardState, delayMs = 350) {
  const latestRef = useRef(board);
  const timerRef = useRef<number | null>(null);

  // всегда держим "последнее" состояние
  useEffect(() => {
    latestRef.current = board;
  }, [board]);

  // дебаунс-сохранение
  useEffect(() => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      saveState(latestRef.current);
      timerRef.current = null;
    }, delayMs);

    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [board, delayMs]);

  // на закрытие вкладки — принудительно сохраняем
  useEffect(() => {
    const onUnload = () => saveState(latestRef.current);
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);
}
