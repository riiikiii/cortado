import { useMemo } from 'react';
import { hasSession } from '../auth/google';
import { readingMinutes } from '../library/text';
import { collections, lessonTitle, readingOrder, sections, startHere } from '../library/tree';
import { lessonState, useStore, useTitle, type Progress } from '../state/store';
import { dirName, kindOf, stem } from '../util/paths';
import beans from '../assets/espresso-beans.webp';
import { GoogleButton } from './GoogleConnect';
import { CupLogo } from './Logo';
import { Avatar, coverStyle, fileIcon, Icon, ProgressRing, StatusDot } from './Icon';
import { SyncStatus } from './SyncButton';

const devAvailable = import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(location.hostname);

export function Home() {
  const vault = useStore((s) => s.vaults.find((v) => v.id === s.activeVaultId));
  const paths = useStore((s) => s.paths);
  const homeFolder = useStore((s) => s.homeFolder);
  if (!vault) return <Welcome />;
  if (!paths.length) return <EmptyVault name={vault.name} />;
  return (
    <div className="home" key={homeFolder ?? '/'}>
      {homeFolder !== null ? <CollectionView folder={homeFolder} /> : <Overview />}
    </div>
  );
}

function stats(lessons: string[], progress: Record<string, Progress>) {
  let done = 0;
  let started = 0;
  for (const p of lessons) {
    const st = lessonState(progress[p]);
    if (st === 'done') done++;
    else if (st === 'started') started++;
  }
  return { done, started, total: lessons.length, ratio: lessons.length ? done / lessons.length : 0 };
}

/** The lesson to carry on with: the last one opened and not finished, else the first unfinished. */
function upNext(lessons: string[], progress: Record<string, Progress>, recent: string[]) {
  const set = new Set(lessons);
  const resume = recent.find((p) => set.has(p) && !progress[p]?.doneAt);
  if (resume) return { path: resume, resume: true };
  const start = startHere(lessons);
  if (start && !Object.values(progress).some((p) => p.doneAt) && !progress[start]?.doneAt) return { path: start, resume: false };
  const first = lessons.find((p) => !progress[p]?.doneAt);
  return first ? { path: first, resume: false } : null;
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function Overview() {
  const vault = useStore((s) => s.vaults.find((v) => v.id === s.activeVaultId))!;
  const paths = useStore((s) => s.paths);
  const progress = useStore((s) => s.progress);
  const recent = useStore((s) => s.recent);
  const docs = useStore((s) => s.docs);
  const titles = useStore((s) => s.titles);
  const { openFile, goHome } = useStore.getState();

  const order = useMemo(() => readingOrder(paths), [paths]);
  const cols = useMemo(() => collections(paths), [paths]);
  const all = stats(order, progress);
  const next = upNext(order, progress, recent);
  const have = new Set(order);
  const recentItems = recent.filter((p) => have.has(p)).slice(0, 6);

  return (
    <div className="home-inner">
      <header className="hero" style={{ backgroundImage: `url(${beans})` }}>
        <div className="hero-text">
          <div className="eyebrow">{greeting()}</div>
          <h1 className="home-title">{vault.name}</h1>
          <p className="home-sub">
            {all.total} {all.total === 1 ? 'lesson' : 'lessons'}
            {all.done > 0 && <> · {all.done} complete</>}
            {all.started > 0 && <> · {all.started} in progress</>}
          </p>
        </div>
        <ProgressRing value={all.ratio} size={84} stroke={7} className="home-ring">
          <strong>{Math.round(all.ratio * 100)}%</strong>
        </ProgressRing>
      </header>

      {next && (
        <button className="continue-card" onClick={() => openFile(next.path)}>
          <span className={`continue-icon kind-${kindOf(next.path)}`}>
            <Icon name={fileIcon(kindOf(next.path))} size={26} />
          </span>
          <span className="continue-text">
            <span className="eyebrow">{next.resume ? 'Continue where you left off' : all.done ? 'Up next' : 'Start here'}</span>
            <span className="continue-title">{titles[next.path] ?? lessonTitle(stem(next.path)).title}</span>
            <span className="continue-meta">
              {dirName(next.path) || vault.name}
              {docs?.get(next.path) && <> · {readingMinutes(docs.get(next.path)!.words)} min read</>}
            </span>
            {next.resume && (progress[next.path]?.ratio ?? 0) > 0.02 && (
              <span className="bar">
                <span style={{ width: `${Math.round((progress[next.path]?.ratio ?? 0) * 100)}%` }} />
              </span>
            )}
          </span>
          <span className="continue-go">
            <Icon name="play" size={18} />
          </span>
        </button>
      )}
      {!next && all.total > 0 && (
        <div className="all-done">
          <Icon name="sparkle" size={22} /> You’ve completed every lesson in this vault.
        </div>
      )}

      {cols.length > 0 && (
        <section className="home-section">
          <h2 className="section-title">Collections</h2>
          <div className="collection-grid">
            {cols.map((c) => {
              const st = stats(c.lessons, progress);
              return (
                <button key={c.path || '/'} className="collection-card" onClick={() => goHome(c.path)} style={coverStyle(c.name)}>
                  <span className="cover">
                    <span className="cover-letter">{c.name.charAt(0).toUpperCase()}</span>
                    {st.done === st.total && <span className="cover-badge"><Icon name="check" size={14} strokeWidth={3} /></span>}
                  </span>
                  <span className="collection-body">
                    <span className="collection-name">{c.name}</span>
                    <span className="collection-meta">
                      {st.total} {st.total === 1 ? 'lesson' : 'lessons'}
                      {st.done > 0 && ` · ${st.done} done`}
                    </span>
                    <span className="bar">
                      <span style={{ width: `${Math.round(st.ratio * 100)}%` }} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {recentItems.length > 0 && (
        <section className="home-section">
          <h2 className="section-title">Recently opened</h2>
          <ul className="lesson-list">
            {recentItems.map((p) => (
              <LessonRow key={p} path={p} showDir />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CollectionView({ folder }: { folder: string }) {
  const paths = useStore((s) => s.paths);
  const progress = useStore((s) => s.progress);
  const recent = useStore((s) => s.recent);
  const { openFile, goHome } = useStore.getState();
  const groups = useMemo(() => sections(paths, folder), [paths, folder]);
  const lessons = groups.flatMap((g) => g.lessons);
  const st = stats(lessons, progress);
  const next = upNext(lessons, progress, recent);
  const name = folder || 'Other notes';

  return (
    <div className="home-inner">
      <button className="back-link" onClick={() => goHome(null)}>
        <Icon name="back" size={18} /> Library
      </button>
      <header className="collection-head" style={coverStyle(name)}>
        <span className="cover large">
          <span className="cover-letter">{name.charAt(0).toUpperCase()}</span>
        </span>
        <div className="collection-head-text">
          <h1 className="home-title">{name}</h1>
          <p className="home-sub">
            {st.done} of {st.total} complete
          </p>
          <span className="bar wide">
            <span style={{ width: `${Math.round(st.ratio * 100)}%` }} />
          </span>
        </div>
        {next && (
          <button className="btn primary" onClick={() => openFile(next.path)}>
            <Icon name="play" size={16} /> {next.resume ? 'Continue' : st.done ? 'Next lesson' : 'Start'}
          </button>
        )}
      </header>

      {groups.map((g) => (
        <section key={g.path} className="home-section">
          {g.name && <h2 className="section-title">{g.name}</h2>}
          <ol className="lesson-list numbered">
            {g.lessons.map((p) => (
              <LessonRow key={p} path={p} highlight={p === next?.path} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function LessonRow({ path, showDir, highlight }: { path: string; showDir?: boolean; highlight?: boolean }) {
  const p = useStore((s) => s.progress[path]);
  const words = useStore((s) => s.docs?.get(path)?.words);
  const openFile = useStore((s) => s.openFile);
  const kind = kindOf(path);
  const state = lessonState(p);
  const { number } = lessonTitle(stem(path));
  const title = useTitle(path);
  return (
    <li>
      <button
        className={`lesson-row ${state} ${highlight ? 'up-next' : ''}`}
        onClick={(e) => openFile(path, { newTab: e.metaKey || e.ctrlKey })}
        onContextMenu={(e) => {
          e.preventDefault();
          openFile(path, { newTab: true });
        }}
      >
        <StatusDot state={state} ratio={p?.ratio} size={22} />
        <span className="lesson-text">
          <span className="lesson-title">
            {number && <span className="lesson-num">{number}</span>}
            {title}
          </span>
          {showDir && dirName(path) && <span className="lesson-dir">{dirName(path)}</span>}
        </span>
        {highlight && <span className="tag">Up next</span>}
        {words !== undefined && <span className="lesson-min">{readingMinutes(words)} min</span>}
        <Icon name={fileIcon(kind)} size={16} className={`ico kind-${kind}`} />
      </button>
    </li>
  );
}

function EmptyVault({ name }: { name: string }) {
  const running = useStore((s) => s.sync.running);
  const vault = useStore((s) => s.vaults.find((v) => v.id === s.activeVaultId));
  return (
    <div className="welcome">
      <div className="welcome-card">
        <CupLogo size={96} animated={running} />
        <h2>{name}</h2>
        {running ? (
          <>
            <p className="muted">Downloading your lessons so they work offline…</p>
            <div className="welcome-progress">
              <SyncStatus />
            </div>
          </>
        ) : (
          <>
            <p className="muted">Nothing is downloaded yet. Sync once and everything stays on this device.</p>
            <button className="btn primary big" onClick={() => useStore.getState().runSync()}>
              <Icon name="sync" size={18} /> Sync now
            </button>
            {vault?.accountId && !hasSession(vault.accountId) && <p className="small muted">You may be asked to sign in to Google again.</p>}
          </>
        )}
      </div>
    </div>
  );
}

function Welcome() {
  const accounts = useStore((s) => s.accounts);
  const siteLibrary = useStore((s) => s.siteLibrary);
  const { openPicker } = useStore.getState();
  const signedIn = accounts.filter((a) => hasSession(a.id));

  return (
    <div className="welcome">
      <div className="welcome-hero">
        <div className="welcome-banner" style={{ backgroundImage: `url(${beans})` }}>
          <span className="welcome-cup">
            <CupLogo size={104} animated />
          </span>
        </div>
        <h1>Cortado</h1>
        <p className="lede">Your guides and notes, beautifully readable and ready to learn from anywhere. Even offline.</p>

        <div className="welcome-actions">
          {signedIn.length > 0 ? (
            <>
              <button className="btn primary big" onClick={() => openPicker({ view: 'browse', accountId: signedIn[0].id })}>
                <Avatar name={signedIn[0].name} photo={signedIn[0].photo} size={24} /> Choose a folder from {signedIn[0].name.split(' ')[0]}’s Drive
              </button>
              <GoogleButton label="Use another Google account" chooseAccount subtle />
            </>
          ) : (
            <GoogleButton label="Continue with Google" />
          )}
          {siteLibrary && (
            <button className="btn ghost" onClick={() => useStore.getState().addSiteLibrary()}>
              <Icon name="book" size={18} /> Open {siteLibrary.name}
            </button>
          )}
          {devAvailable && (
            <button
              className="btn ghost"
              onClick={async () => {
                await useStore.getState().addVault({ name: 'Sample vault', provider: 'dev', rootFolderId: 'dev' });
                useStore.getState().runSync();
              }}
            >
              <Icon name="sparkle" size={18} /> Try the sample vault
            </button>
          )}
        </div>

        <ol className="steps">
          <li>
            <span className="step-num">1</span>
            <span>
              <strong>Sign in with Google</strong>
              <small>Read-only. Cortado never changes your files.</small>
            </span>
          </li>
          <li>
            <span className="step-num">2</span>
            <span>
              <strong>Pick a folder</strong>
              <small>Your own, or one someone shared with you.</small>
            </span>
          </li>
          <li>
            <span className="step-num">3</span>
            <span>
              <strong>Learn anywhere</strong>
              <small>Everything is saved on this device.</small>
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}

