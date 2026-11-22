import { useEffect, useMemo, useRef, useState } from 'react';
import { Appearance } from '../components/Appearance';
import { fileIcon, Icon } from '../components/Icon';
import { readingMinutes } from '../library/text';
import { lessonTitle, neighbours, readingOrder } from '../library/tree';
import { useStore, type Tab } from '../state/store';
import { kindOf, stem } from '../util/paths';
import { DocView } from './DocView';
import type { OutlineItem, ScrollInfo, ViewerEvents } from './types';

/** One open document: the document itself plus its toolbar, progress line and lesson controls. */
export function Reader({ tab, vaultId }: { tab: Tab; vaultId: string }) {
  const kind = kindOf(tab.path);
  const paths = useStore((s) => s.paths);
  const done = useStore((s) => !!s.progress[tab.path]?.doneAt);
  const words = useStore((s) => s.docs?.get(tab.path)?.words);
  const order = useMemo(() => readingOrder(paths), [paths]);
  const { prev, next } = neighbours(order, tab.path);

  const [scroll, setScroll] = useState<ScrollInfo>({ ratio: 0, y: 0, section: -1 });
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [hidden, setHidden] = useState(false);
  const jump = useRef<(i: number) => void>(() => {});
  const lastY = useRef(0);
  const pathRef = useRef(tab.path);
  pathRef.current = tab.path;

  useEffect(() => {
    setOutline([]);
    setScroll({ ratio: 0, y: 0, section: -1 });
    setHidden(false);
    lastY.current = 0;
  }, [tab.path, tab.nonce]);

  const canHide = kind === 'md' || kind === 'text';
  const events = useMemo<ViewerEvents>(
    () => ({
      onScroll(info) {
        setScroll(info);
        const dy = info.y - lastY.current;
        if (info.y < 48) setHidden(false);
        else if (Math.abs(dy) > 8) setHidden(dy > 0);
        if (Math.abs(dy) > 8 || info.y < 48) lastY.current = info.y;
        useStore.getState().recordProgress(pathRef.current, info.ratio);
      },
      onOutline: setOutline,
      registerJump(fn) {
        jump.current = fn;
      },
    }),
    [],
  );

  const finish = () => completeLesson(tab.path, next);
  const footer =
    kind === 'md' ? (
      <footer className="md-end">
        <div className="md-end-inner">
          {done ? (
            <div className="end-done">
              <Icon name="check-circle" size={22} /> Lesson complete
            </div>
          ) : (
            <button className="btn primary big" onClick={finish}>
              <Icon name="check" size={18} strokeWidth={2.4} /> {next ? 'Mark complete & continue' : 'Mark as complete'}
            </button>
          )}
          {next && (
            <button className="next-card" onClick={() => useStore.getState().openFile(next)}>
              <span className="next-text">
                <span className="eyebrow">Up next</span>
                <span className="next-title">{lessonTitle(stem(next)).title}</span>
              </span>
              <Icon name="arrow-right" size={20} />
            </button>
          )}
        </div>
      </footer>
    ) : undefined;

  const showPill = (kind === 'html' || kind === 'pdf' || kind === 'image') && scroll.ratio > 0.96 && (!done || next);

  return (
    <div className={`reader kind-${kind} ${canHide && hidden ? 'chrome-hidden' : ''}`}>
      <DocBar
        path={tab.path}
        kind={kind}
        overlay={canHide}
        outline={outline}
        section={scroll.section}
        onJump={(i) => jump.current(i)}
        prev={prev}
        next={next}
        done={done}
        minutes={words ? readingMinutes(words) : undefined}
      />
      <div className="read-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${scroll.ratio})` }} />
      </div>
      <div className="reader-body">
        <DocView tab={tab} vaultId={vaultId} events={events} footer={footer} />
      </div>
      {showPill && (
        <div className="finish-pill" role="group" aria-label="Lesson">
          {!done && (
            <button className="pill-btn" onClick={() => useStore.getState().setDone(tab.path, true)}>
              <Icon name="check" size={16} strokeWidth={2.4} /> Mark complete
            </button>
          )}
          {next && (
            <button className="pill-btn primary" onClick={finish}>
              Next: {lessonTitle(stem(next)).title} <Icon name="arrow-right" size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Mark a lesson complete, cheer a little, and move on to the next one. */
export function completeLesson(path: string, next?: string) {
  const s = useStore.getState();
  s.setDone(path, true);
  const folder = path.split('/')[0];
  const inFolder = path.includes('/') ? readingOrder(s.paths).filter((p) => p.startsWith(`${folder}/`)) : [];
  const progress = useStore.getState().progress;
  const doneCount = inFolder.filter((p) => progress[p]?.doneAt).length;
  s.showToast(inFolder.length > 1 ? `Nice work. ${doneCount} of ${inFolder.length} done in ${folder}.` : 'Nice work. Lesson complete.');
  if (next) s.openFile(next);
}

function DocBar({
  path,
  kind,
  overlay,
  outline,
  section,
  onJump,
  prev,
  next,
  done,
  minutes,
}: {
  path: string;
  kind: string;
  overlay: boolean;
  outline: OutlineItem[];
  section: number;
  onJump: (i: number) => void;
  prev?: string;
  next?: string;
  done: boolean;
  minutes?: number;
}) {
  const [menu, setMenu] = useState<'outline' | 'type' | null>(null);
  const { openFile, setDone, goHome } = useStore.getState();
  const parts = path.split('/');
  const folders = parts.slice(0, -1);
  const minLevel = Math.min(...outline.map((o) => o.level));

  return (
    <div className={`docbar ${overlay ? 'overlay' : ''}`}>
      <nav className="crumbs" aria-label="Location">
        {folders.length > 0 && (
          <>
            <button className="crumb" onClick={() => goHome(folders[0])} title={`Open ${folders[0]}`}>
              {folders[0]}
            </button>
            {folders.length > 1 && <span className="crumb-more">{folders.length > 2 ? '… / ' : ''}{folders[folders.length - 1]}</span>}
            <Icon name="chevron" size={12} className="crumb-sep" />
          </>
        )}
        <span className="crumb-current">
          <Icon name={fileIcon(kind)} size={15} className={`ico kind-${kind}`} />
          <span className="crumb-title">{stem(path)}</span>
        </span>
        {minutes !== undefined && (
          <span className="meta-chip" title="Reading time">
            <Icon name="clock" size={13} /> {minutes} min
          </span>
        )}
      </nav>

      <div className="docbar-actions">
        {outline.length > 1 && (
          <button className={`icon-btn ${menu === 'outline' ? 'on' : ''}`} aria-label="Outline" title="Outline" onClick={() => setMenu(menu === 'outline' ? null : 'outline')}>
            <Icon name="outline" />
          </button>
        )}
        {(kind === 'md' || kind === 'text') && (
          <button className={`icon-btn ${menu === 'type' ? 'on' : ''}`} aria-label="Text and theme" title="Text and theme" onClick={() => setMenu(menu === 'type' ? null : 'type')}>
            <Icon name="type" />
          </button>
        )}
        <button
          className={`icon-btn done-toggle ${done ? 'is-done' : ''}`}
          aria-pressed={done}
          aria-label={done ? 'Completed. Tap to mark as not done' : 'Mark as complete'}
          title={done ? 'Completed' : 'Mark as complete'}
          onClick={() => (done ? setDone(path, false) : completeLesson(path))}
        >
          <Icon name="check-circle" />
        </button>
        <span className="docbar-sep" />
        <button className="icon-btn" disabled={!prev} aria-label="Previous lesson" title={prev ? `Previous: ${stem(prev)}` : undefined} onClick={() => prev && openFile(prev)}>
          <Icon name="arrow-left" />
        </button>
        <button className="icon-btn" disabled={!next} aria-label="Next lesson" title={next ? `Next: ${stem(next)}` : undefined} onClick={() => next && openFile(next)}>
          <Icon name="arrow-right" />
        </button>
      </div>

      {menu && (
        <>
          <div className="popover-backdrop" onClick={() => setMenu(null)} />
          <div className={`popover ${menu}`} role="dialog" aria-label={menu === 'outline' ? 'Outline' : 'Text and theme'}>
            {menu === 'outline' ? (
              <>
                <div className="popover-title">On this page</div>
                <ul className="outline-list">
                  {outline.map((o, i) => (
                    <li key={i}>
                      <button
                        className={`outline-item ${i === section ? 'current' : ''}`}
                        style={{ paddingLeft: 12 + (o.level - minLevel) * 14 }}
                        onClick={() => {
                          onJump(i);
                          setMenu(null);
                        }}
                      >
                        {o.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Appearance compact />
            )}
          </div>
        </>
      )}
    </div>
  );
}
