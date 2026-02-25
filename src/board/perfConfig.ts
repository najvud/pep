export const BOARD_PERF = Object.freeze({
  columnVirtualization: {
    threshold: 42,
    overscan: 8,
    rowMin: 112,
    rowMax: 176,
  },
  history: {
    pageSize: 120,
    virtualization: {
      overscan: 8,
      groupRowEstimate: 32,
      itemRowEstimate: 84,
      minRows: 16,
      desktopBufferRows: 12,
      mobileBufferRows: 8,
    },
  },
  comments: {
    archivePageSize: 40,
    virtualization: {
      threshold: 180,
      overscan: 8,
      dayRowEstimate: 28,
      itemRowEstimate: 92,
    },
  },
} as const);

export function clampColumnVirtualRowEstimate(estimate: number): number {
  const rounded = Math.round(Number.isFinite(estimate) ? estimate : 0);
  return Math.min(
    BOARD_PERF.columnVirtualization.rowMax,
    Math.max(BOARD_PERF.columnVirtualization.rowMin, rounded)
  );
}

export function resolveHistoryVirtualizeThreshold(viewportHeight: number, isMobile: boolean): number {
  const viewport = viewportHeight > 0 ? viewportHeight : 560;
  const itemEstimate = BOARD_PERF.history.virtualization.itemRowEstimate;
  const visibleRows = Math.max(1, Math.ceil(viewport / itemEstimate));
  const bufferRows = isMobile
    ? BOARD_PERF.history.virtualization.mobileBufferRows
    : BOARD_PERF.history.virtualization.desktopBufferRows;
  return Math.max(BOARD_PERF.history.virtualization.minRows, visibleRows + bufferRows);
}
