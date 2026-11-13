import { useRef, useState, type ChangeEvent } from 'react';
import { useI18n } from '../i18n/context';
import type { Messages } from '../i18n/messages';
import { MAX_IMPORT_BYTES, exportFileName, parseImport, toExportFile, type ImportedData } from '../transfer';
import type { AppState } from '../useTournament';
import { ConfirmDialog } from './ConfirmDialog';

type Props = { state: AppState; onLoad: (data: ImportedData) => void };

type Notice = { kind: 'ok' | 'error'; text: string } | null;

function download(text: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DataTools({ state, onLoad }: Props) {
  const { t } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ImportedData | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const showError = (key: keyof Messages['importErrors']) => setNotice({ kind: 'error', text: t.importErrors[key] });

  const load = (data: ImportedData) => {
    onLoad(data);
    setNotice({ kind: 'ok', text: t.importDone(data.items.length) });
  };

  const exportJson = () => {
    download(JSON.stringify(toExportFile(state), null, 2), exportFileName());
    setNotice(null);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return showError('tooLarge');

    let text: string;
    try {
      text = await file.text();
    } catch {
      return showError('readFailed');
    }

    const result = parseImport(text);
    if (!result.ok) return showError(result.error);

    // Only ask when there is something to lose.
    if (state.items.length > 0) setPendingImport(result.data);
    else load(result.data);
  };

  return (
    <section className="data-tools" aria-label={t.dataToolsLabel}>
      <div className="data-buttons">
        <button type="button" onClick={exportJson} disabled={state.items.length === 0}>
          {t.exportJson}
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          {t.importJson}
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onFile} />
      </div>
      {notice && (
        <p className={notice.kind === 'error' ? 'hint error' : 'hint'} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}

      <ConfirmDialog
        open={pendingImport !== null}
        title={t.importTitle}
        message={t.importMessage}
        confirmLabel={t.importConfirm}
        danger
        onConfirm={() => {
          if (pendingImport) load(pendingImport);
          setPendingImport(null);
        }}
        onCancel={() => setPendingImport(null)}
      />
    </section>
  );
}
