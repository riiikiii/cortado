import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Appearance } from '../components/Appearance';
import { Icon } from '../components/Icon';
import { ToolbarSlot } from '../components/toolbarSlot';
import { readingMinutes } from '../library/text';
import { lessonTitle, neighbours, readingOrder } from '../library/tree';
import { titleOf, useStore, type DocTab } from '../state/store';
import { kindOf, stem } from '../util/paths';
import { DocView } from './DocView';
import type { OutlineItem, ScrollInfo, ViewerEvents } from './types';

/** One open document: the document itself, its progress line and lesson controls. */
export function Reader({ tab, vaultId, active }: { tab: DocTab; vaultId: string; active: boolean }) {
  const kind = kindOf(tab.path);
  const paths = useStore((s) => s.paths);
  const done = useStore((s) => !!s.progress[tab.path]?.doneAt);
  const words = useStore((s) => s.docs?.get(tab.path)?.words);
  const order = useMemo(() => readingOrder(paths), [paths]);
  const { prev, next } = neighbours(order, tab.path);
  const nextTitle = useStore((s) => (next ? (s.titles[next] ?? lessonTitle(stem(next)).title) : ''));
  const slot = useContext(ToolbarSlot);

  const [scroll, setScroll] = useState<ScrollInfo>({ ratio: 0, y: 0, section: -1 });
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const jump = useRef<(i: number) => void>(() => {});
  const pathRef = useRef(tab.path);
  pathRef.current = tab.path;

  useEffect(() => {
    setOutline([]);
    setScroll({ ratio: 0, y: 0, section: -1 });
  }, [tab.path, tab.nonce]);

  const events = useMemo<ViewerEvents>(
    () => ({
      onScroll(info) {
        setScroll(info);
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
                <span className="next-title">{nextTitle}</span>
              </span>
              <Icon name="arrow-right" size={20} />
            </button>
          )}
        </div>
      </footer>
    ) : undefined;

  const showPill = (kind === 'html' || kind === 'pdf' || kind === 'image') && scroll.ratio > 0.96 && (!done || next);

  return (
    <div className={`reader kind-${kind}`}>
      {active &&
        slot &&
        createPortal(
          <DocActions
            path={tab.path}
            kind={kind}
            outline={outline}
            section={scroll.section}
            onJump={(i) => jump.current(i)}
            prev={prev}
            next={next}
            done={done}
            minutes={words ? readingMinutes(words) : undefined}
          />,
          slot,
        )}
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
              Next: {nextTitle} <Icon name="arrow-right" size={16} />
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

/** The active document's buttons, shown at the right of the top bar. */
function DocActions({
  path,
  kind,
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
  outline: OutlineItem[];
  section: number;
  onJump: (i: number) => void;
  prev?: string;
  next?: string;
  done: boolean;
  minutes?: number;
}) {
  const [menu, setMenu] = useState<'outline' | 'type' | null>(null);
  const { openFile, setDone } = useStore.getState();
  const minLevel = Math.min(...outline.map((o) => o.level));

  return (
    <div className="doc-actions">
      {outline.length > 1 && (
        <button className={`icon-btn ${menu === 'outline' ? 'on' : ''}`} aria-label="Outline" title="Outline" onClick={() => setMenu(menu === 'outline' ? null : 'outline')}>
          <Icon name="outline" />
        </button>
      )}
      {(kind === 'md' || kind === 'text' || kind === 'html') && (
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
      <span className="bar-sep lesson-nav" />
      <button className="icon-btn lesson-nav" disabled={!prev} aria-label="Previous lesson" title={prev ? `Previous: ${titleOf(prev)}` : undefined} onClick={() => prev && openFile(prev)}>
        <Icon name="arrow-left" />
      </button>
      <button className="icon-btn lesson-nav" disabled={!next} aria-label="Next lesson" title={next ? `Next: ${titleOf(next)}` : undefined} onClick={() => next && openFile(next)}>
        <Icon name="arrow-right" />
      </button>

      {menu && (
        <>
          <div className="popover-backdrop" onClick={() => setMenu(null)} />
          <div className={`popover ${menu}`} role="dialog" aria-label={menu === 'outline' ? 'Outline' : 'Text and theme'}>
            {menu === 'outline' ? (
              <>
                <div className="popover-title">
                  On this page
                  {minutes !== undefined && (
                    <span className="popover-meta">
                      <Icon name="clock" size={13} /> {minutes} min read
                    </span>
                  )}
                </div>
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
