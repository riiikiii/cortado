import { lazy, Suspense, useEffect, useState } from 'react';
import type { Tab } from '../state/store';
import { getBlob } from '../storage/db';
import { kindOf, vaultUrl } from '../util/paths';
import { HtmlView } from './HtmlView';
// Markdown, highlighting and sanitising are loaded on first use to keep startup fast.
const MarkdownView = lazy(() => import('./MarkdownView').then((m) => ({ default: m.MarkdownView })));

export function DocView({ tab, vaultId }: { tab: Tab; vaultId: string }) {
  switch (kindOf(tab.path)) {
    case 'html':
      return <HtmlView tab={tab} vaultId={vaultId} />;
    case 'md':
      return (
        <Suspense fallback={null}>
          <MarkdownView tab={tab} vaultId={vaultId} />
        </Suspense>
      );
    case 'image':
      return (
        <div className="media-view">
          <img src={vaultUrl(vaultId, tab.path)} alt={tab.path} />
        </div>
      );
    case 'pdf':
      return <iframe className="doc-frame" src={vaultUrl(vaultId, tab.path)} title={tab.path} />;
    case 'text':
      return <TextView tab={tab} vaultId={vaultId} />;
    default:
      return <div className="empty">This file type can't be previewed.</div>;
  }
}

function TextView({ tab, vaultId }: { tab: Tab; vaultId: string }) {
  const [text, setText] = useState('');
  useEffect(() => {
    getBlob(vaultId, tab.path).then((b) => b?.text().then(setText));
  }, [vaultId, tab.path, tab.nonce]);
  return (
    <div className="md-scroll">
      <pre className="text-view">{text}</pre>
    </div>
  );
}
