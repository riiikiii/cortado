import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { CupLogo } from '../components/Logo';
import { useStore, type Tab } from '../state/store';
import { getBlob } from '../storage/db';
import { kindOf, vaultUrl } from '../util/paths';
import { HtmlView } from './HtmlView';
import type { ViewerEvents } from './types';
// Markdown, highlighting and sanitising are loaded on first use to keep startup fast.
const MarkdownView = lazy(() => import('./MarkdownView').then((m) => ({ default: m.MarkdownView })));

export function DocView({ tab, vaultId, events, footer }: { tab: Tab; vaultId: string; events: ViewerEvents; footer?: ReactNode }) {
  // Guides, PDFs and images (also those inside notes) are served by the service worker. On the
  // very first launch it is still installing, and a request then goes to the web server and 404s.
  const sw = useStore((s) => s.sw);
  if (sw === 'pending') {
    return (
      <div className="doc-waiting" role="status">
        <CupLogo size={72} animated />
        <p>Getting your library ready to read offline…</p>
      </div>
    );
  }
  switch (kindOf(tab.path)) {
    case 'html':
      return <HtmlView tab={tab} vaultId={vaultId} events={events} />;
    case 'md':
      return (
        <Suspense fallback={<div className="md-scroll" />}>
          <MarkdownView tab={tab} vaultId={vaultId} events={events} footer={footer} />
        </Suspense>
      );
    case 'image':
      return (
        <div className="media-view">
          <img src={vaultUrl(vaultId, tab.path)} alt={tab.path} />
        </div>
      );
    case 'pdf':
      return <iframe className="doc-frame loaded" src={vaultUrl(vaultId, tab.path)} title={tab.path} />;
    case 'text':
      return <TextView tab={tab} vaultId={vaultId} events={events} />;
    default:
      return <div className="empty">This file type can’t be previewed.</div>;
  }
}

function TextView({ tab, vaultId, events }: { tab: Tab; vaultId: string; events: ViewerEvents }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    getBlob(vaultId, tab.path).then((b) => b?.text().then(setText));
  }, [vaultId, tab.path, tab.nonce]);
  return (
    <div
      className="md-scroll"
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        const max = el.scrollHeight - el.clientHeight;
        events.onScroll?.({ y: el.scrollTop, ratio: max > 4 ? el.scrollTop / max : 1, section: -1 });
      }}
    >
      <pre className="text-view">{text}</pre>
    </div>
  );
}
