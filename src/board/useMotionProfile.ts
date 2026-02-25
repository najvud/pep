import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion, type Transition } from 'framer-motion';

type SurfaceState = { opacity: number; y: number; scale: number };

export type MotionProfile = {
  reducedMotion: boolean;
  isMobile: boolean;
  searchSlideX: number;
  searchScaleFrom: number;
  dropMarkerOffsetY: number;
  pinAttachStartTop: number;
  overlayPinLiftTop: number;
  overlayDropDurationMs: number;
  overlayDropEasing: string;
  pinPulseClearDelayMs: number;
  queuePinAttachDelayMs: number;
  controlLayoutTransition: Transition;
  controlFadeTransition: Transition;
  filterPanelTransition: Transition;
  dropMarkerTransition: Transition;
  dropMarkerLineTransition: Transition;
  pinAttachTransition: Transition;
  overlayPinLiftTransition: Transition;
  modalBackdropTransition: Transition;
  modalSurfaceTransition: Transition;
  modalSurfaceInitial: SurfaceState;
  modalSurfaceAnimate: SurfaceState;
  modalSurfaceExit: SurfaceState;
};

const MOBILE_BREAKPOINT = 900;
const EASE_STANDARD: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_EMPHASIS: [number, number, number, number] = [0.2, 0.84, 0.24, 1];
const EASE_PIN: [number, number, number, number] = [0.2, 0.86, 0.22, 1];

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);

    const update = () => setMatches(media.matches);
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, [query]);

  return matches;
}

export function useMotionProfile(): MotionProfile {
  const prefersReducedMotion = !!useReducedMotion();
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);

  return useMemo<MotionProfile>(() => {
    if (prefersReducedMotion) {
      const stillSurface = { opacity: 1, y: 0, scale: 1 };
      return {
        reducedMotion: true,
        isMobile,
        searchSlideX: 0,
        searchScaleFrom: 1,
        dropMarkerOffsetY: 0,
        pinAttachStartTop: -1,
        overlayPinLiftTop: -1,
        overlayDropDurationMs: 0,
        overlayDropEasing: 'linear',
        pinPulseClearDelayMs: 48,
        queuePinAttachDelayMs: 0,
        controlLayoutTransition: { duration: 0.01 },
        controlFadeTransition: { duration: 0.01 },
        filterPanelTransition: { duration: 0.01 },
        dropMarkerTransition: { duration: 0.01 },
        dropMarkerLineTransition: { duration: 0.01 },
        pinAttachTransition: { duration: 0.01 },
        overlayPinLiftTransition: { duration: 0.01 },
        modalBackdropTransition: { duration: 0.01 },
        modalSurfaceTransition: { duration: 0.01 },
        modalSurfaceInitial: stillSurface,
        modalSurfaceAnimate: stillSurface,
        modalSurfaceExit: stillSurface,
      };
    }

    if (isMobile) {
      return {
        reducedMotion: false,
        isMobile: true,
        searchSlideX: 10,
        searchScaleFrom: 0.98,
        dropMarkerOffsetY: 2,
        pinAttachStartTop: -12,
        overlayPinLiftTop: -18,
        overlayDropDurationMs: 180,
        overlayDropEasing: 'cubic-bezier(0.2, 0.88, 0.22, 1)',
        pinPulseClearDelayMs: 320,
        queuePinAttachDelayMs: 188,
        controlLayoutTransition: { duration: 0.16, ease: EASE_STANDARD },
        controlFadeTransition: { duration: 0.14, ease: EASE_STANDARD },
        filterPanelTransition: { duration: 0.16, ease: EASE_EMPHASIS },
        dropMarkerTransition: { type: 'spring', stiffness: 420, damping: 34, mass: 0.72 },
        dropMarkerLineTransition: { duration: 0.14, ease: EASE_STANDARD },
        pinAttachTransition: { duration: 0.2, ease: EASE_PIN },
        overlayPinLiftTransition: { duration: 0.1, ease: EASE_PIN },
        modalBackdropTransition: { duration: 0.14, ease: EASE_STANDARD },
        modalSurfaceTransition: { type: 'spring', stiffness: 410, damping: 34, mass: 0.82 },
        modalSurfaceInitial: { opacity: 0, y: 12, scale: 0.99 },
        modalSurfaceAnimate: { opacity: 1, y: 0, scale: 1 },
        modalSurfaceExit: { opacity: 0, y: 8, scale: 0.992 },
      };
    }

    return {
      reducedMotion: false,
      isMobile: false,
      searchSlideX: 14,
      searchScaleFrom: 0.96,
      dropMarkerOffsetY: 3,
      pinAttachStartTop: -14,
      overlayPinLiftTop: -22,
      overlayDropDurationMs: 210,
      overlayDropEasing: 'cubic-bezier(0.22, 0.84, 0.24, 1)',
      pinPulseClearDelayMs: 360,
      queuePinAttachDelayMs: 228,
      controlLayoutTransition: { duration: 0.18, ease: EASE_STANDARD },
      controlFadeTransition: { duration: 0.16, ease: EASE_STANDARD },
      filterPanelTransition: { duration: 0.18, ease: EASE_EMPHASIS },
      dropMarkerTransition: { type: 'spring', stiffness: 420, damping: 34, mass: 0.72 },
      dropMarkerLineTransition: { duration: 0.16, ease: EASE_STANDARD },
      pinAttachTransition: { duration: 0.22, ease: EASE_PIN },
      overlayPinLiftTransition: { duration: 0.11, ease: EASE_PIN },
      modalBackdropTransition: { duration: 0.18, ease: EASE_STANDARD },
      modalSurfaceTransition: { type: 'spring', stiffness: 440, damping: 34, mass: 0.84 },
      modalSurfaceInitial: { opacity: 0, y: 16, scale: 0.985 },
      modalSurfaceAnimate: { opacity: 1, y: 0, scale: 1 },
      modalSurfaceExit: { opacity: 0, y: 10, scale: 0.988 },
    };
  }, [prefersReducedMotion, isMobile]);
}
