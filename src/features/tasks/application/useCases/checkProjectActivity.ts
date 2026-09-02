import {
  activityEventKey,
  detectProjectActivity,
  type ProjectActivityEvent,
} from '../../domain/ProjectActivity';
import type { Task } from '../../domain/Task';
import type { TaskList } from '../../domain/TaskList';
import type { AppLanguage } from '../../presentation/localization/taskCopy';
import type { ActivityLedgerStore } from '../ports/ActivityLedgerStore';
import type { ActivityNotifier } from '../ports/ActivityNotifier';
import type { ShareGateway } from '../ports/ShareGateway';

export interface ProjectActivityDeps {
  ledger: ActivityLedgerStore;
  notifier: ActivityNotifier;
  language: AppLanguage;
  /** The signed-in account. Its own facts are never news. */
  meId: string;
  /** The "Notificações do espaço" setting. Off means nothing is detected and
   * nothing is written. */
  enabled: boolean;
}

/**
 * One project that was just read from the network, turned into notifications.
 *
 * The ledger is written before anything is shown: if the process dies between
 * the two, a person misses one line — which is far better than being told the
 * same fact twice, every pull, forever.
 *
 * Returns how many notifications were shown, which is what the tests assert on
 * and what the background task logs.
 */
export function reportProjectActivity(
  project: { list: TaskList; tasks: readonly Task[] },
  deps: ProjectActivityDeps,
): Promise<number> {
  if (!deps.enabled) return Promise.resolve(0);

  const share = project.list.share;
  if (share == null) return Promise.resolve(0);

  // Two pulls of the same project can overlap — the tab's first paint, a pull
  // to refresh and the return to the foreground all call this — and a ledger
  // read that starts before another one's write is exactly how the same fact
  // gets told twice. One queue per project makes read and write one step.
  return enqueue(share.token, () => runReport(project, share.token, deps));
}

/** One promise chain per project, dropped as soon as it drains. */
const inFlight = new Map<string, Promise<unknown>>();

function enqueue<T>(token: string, run: () => Promise<T>): Promise<T> {
  const previous = inFlight.get(token) ?? Promise.resolve();
  // A failed run must not poison the queue behind it.
  const next = previous.catch(() => undefined).then(run);

  const settled = next.catch(() => undefined);
  inFlight.set(token, settled);
  // The map holds the tail of the chain only while there is one: a project
  // checked once an hour must not keep a promise alive forever.
  settled.then(() => {
    if (inFlight.get(token) === settled) inFlight.delete(token);
  });

  return next;
}

async function runReport(
  project: { list: TaskList; tasks: readonly Task[] },
  token: string,
  deps: ProjectActivityDeps,
): Promise<number> {
  const ledger = await deps.ledger.load(token);
  const events = detectProjectActivity(project, ledger.keys, deps.meId);

  if (events.length === 0) {
    if (!ledger.bootstrapped) {
      await deps.ledger.save(token, { ...ledger, bootstrapped: true });
    }

    return 0;
  }

  const keys = [...ledger.keys, ...events.map(activityEventKey)];
  await deps.ledger.save(token, { keys, bootstrapped: true });

  // The first time this device sees a project, everything already there is
  // history, not news: it is recorded in silence.
  if (!ledger.bootstrapped) return 0;

  if (!(await deps.notifier.isAllowed())) return 0;

  await deps.notifier.present(events, deps.language);

  return countShown(events);
}

/**
 * Claims one event key for the layer that is about to show it.
 *
 * This is what keeps push (Layer B) and the sync detection (Layer A) from
 * telling the same fact twice: whichever gets there first writes the key and
 * shows the line, and the other one finds it already taken. It runs in the
 * same per-project queue as the detection, so the two never interleave.
 */
export function claimActivityKey(
  token: string,
  key: string,
  ledger: ActivityLedgerStore,
): Promise<boolean> {
  return enqueue(token, async () => {
    const stored = await ledger.load(token);
    if (stored.keys.includes(key)) return false;

    await ledger.save(token, {
      keys: [...stored.keys, key],
      // A push arriving before this device ever pulled the project is still
      // news: it is about something that just happened.
      bootstrapped: true,
    });

    return true;
  });
}

/** Three lines at most per project; beyond that the notifier shows one
 * summary, and the count has to say the same. */
function countShown(events: readonly ProjectActivityEvent[]): number {
  const perToken = new Map<string, number>();

  for (const event of events) {
    perToken.set(event.token, (perToken.get(event.token) ?? 0) + 1);
  }

  let shown = 0;
  for (const count of perToken.values()) shown += count > 3 ? 1 : count;

  return shown;
}

/**
 * Every shared project on this device, pulled and checked in one pass.
 *
 * This is what the background task runs with the app closed, so it takes its
 * data through ports only — no React, no theme, no view model.
 */
export async function sweepProjectActivity(
  lists: readonly TaskList[],
  shareGateway: ShareGateway,
  deps: ProjectActivityDeps,
): Promise<number> {
  if (!deps.enabled) return 0;

  let shown = 0;

  for (const list of lists) {
    if (list.share == null) continue;

    try {
      const remote = await shareGateway.pull(list.share);
      if (remote == null) continue;

      shown += await reportProjectActivity(remote, deps);
    } catch {
      // A project that could not be read this time is simply read again on
      // the next wake-up; one failure never stops the others.
    }
  }

  return shown;
}
