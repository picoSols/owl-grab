// OWL freeze-updates: prevents OWL component re-renders while grab is active.
// OWL 2.x doesn't have the same fiber/dispatcher architecture as React,
// so we use a simpler approach: intercept OWL's scheduler.

let isUpdatesPaused = false;
let originalRequestAnimationFrame: typeof requestAnimationFrame | null = null;
const bufferedCallbacks: Array<FrameRequestCallback> = [];

export const freezeUpdates = (): (() => void) => {
  if (isUpdatesPaused) return () => {};

  isUpdatesPaused = true;

  // Intercept requestAnimationFrame to buffer OWL's render scheduling
  // OWL uses rAF internally for batching component updates
  originalRequestAnimationFrame = window.requestAnimationFrame;
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    if (isUpdatesPaused) {
      bufferedCallbacks.push(callback);
      return -1;
    }
    return originalRequestAnimationFrame!(callback);
  }) as typeof requestAnimationFrame;

  return () => {
    if (!isUpdatesPaused) return;
    isUpdatesPaused = false;

    // Restore original rAF
    if (originalRequestAnimationFrame) {
      window.requestAnimationFrame = originalRequestAnimationFrame;
      originalRequestAnimationFrame = null;
    }

    // Replay buffered callbacks
    const callbacks = bufferedCallbacks.splice(0);
    for (const cb of callbacks) {
      try {
        window.requestAnimationFrame(cb);
      } catch {
        // Swallow errors during replay
      }
    }
  };
};
