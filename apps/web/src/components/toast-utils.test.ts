import * as assert from 'node:assert/strict';
import {
  DEFAULT_TOAST_DURATION,
  shouldAutoDismiss,
  createToast,
  addToast,
  removeToast,
  startTimerState,
  pauseTimerState,
  resumeTimerState,
  timerDelay,
  MIN_RESUME_DELAY,
  type Toast,
} from './toast-utils';

const runAssertions = () => {
  // Default lifetime sits in the 5-6s window required by #841.
  assert.ok(DEFAULT_TOAST_DURATION >= 5000 && DEFAULT_TOAST_DURATION <= 6000);

  // createToast applies defaults.
  const t = createToast({ message: 'Request failed', variant: 'error' }, 'id-1');
  assert.deepEqual(t, {
    id: 'id-1',
    message: 'Request failed',
    variant: 'error',
    duration: DEFAULT_TOAST_DURATION,
  });

  // Caller can opt a toast out of auto-dismiss with duration 0 (manual close only).
  const sticky = createToast({ message: 'stays', duration: 0 }, 'id-2');
  assert.equal(shouldAutoDismiss(sticky), false);
  assert.equal(shouldAutoDismiss(t), true);
  assert.equal(shouldAutoDismiss({ duration: -1 }), false);
  assert.equal(shouldAutoDismiss({ duration: Number.POSITIVE_INFINITY }), false);

  // Variant defaults to "info".
  assert.equal(createToast({ message: 'hi' }, 'id-3').variant, 'info');

  // add/remove are immutable.
  const start: Toast[] = [];
  const afterAdd = addToast(start, t);
  assert.equal(start.length, 0);
  assert.deepEqual(afterAdd, [t]);

  // removeToast clears the matching id (drives both the timer and the close button).
  const afterRemove = removeToast(afterAdd, 'id-1');
  assert.deepEqual(afterRemove, []);
  // Removing an unknown id is a no-op.
  assert.deepEqual(removeToast(afterAdd, 'nope'), [t]);

  // ── #1075: pause/resume must resume, not restart ──────────────────────────

  const err = createToast({ message: 'API request failed', variant: 'error' }, 'err-1');

  // A countdown starts with the full duration running.
  const started = startTimerState(err, 1_000);
  assert.deepEqual(started, { remaining: DEFAULT_TOAST_DURATION, resumedAt: 1_000 });
  assert.equal(timerDelay(started), DEFAULT_TOAST_DURATION);

  // Hovering 1.5s in freezes the countdown with the rest still owing.
  const paused = pauseTimerState(started, 2_500);
  assert.equal(paused.resumedAt, null);
  assert.equal(paused.remaining, DEFAULT_TOAST_DURATION - 1_500);

  // Pausing again (React fires mouseenter per element boundary) changes nothing.
  assert.deepEqual(pauseTimerState(paused, 9_999), paused);

  // Leaving after a long hover resumes the *remainder* — the old code restarted
  // the full 5.5s here, which is why the toast never dismissed on time.
  const resumed = resumeTimerState(paused, 60_000);
  assert.equal(resumed.remaining, DEFAULT_TOAST_DURATION - 1_500);
  assert.equal(resumed.resumedAt, 60_000);
  assert.ok(resumed.remaining < DEFAULT_TOAST_DURATION);

  // Resuming a running countdown is a no-op, so it can't be extended.
  assert.deepEqual(resumeTimerState(resumed, 70_000), resumed);

  // The countdown genuinely completes across a pause/resume cycle.
  const nearlyDone = pauseTimerState(resumed, 60_000 + resumed.remaining);
  assert.equal(nearlyDone.remaining, 0);

  // An expired countdown still dismisses promptly rather than scheduling a
  // non-positive timeout.
  assert.equal(timerDelay(nearlyDone), MIN_RESUME_DELAY);
  assert.ok(MIN_RESUME_DELAY > 0);

  // Elapsed time is never counted as negative if clocks jump backwards.
  assert.equal(pauseTimerState(started, 500).remaining, DEFAULT_TOAST_DURATION);

  console.log('toast-utils: all assertions passed');
};

runAssertions();
