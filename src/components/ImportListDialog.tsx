import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_LINES, MAX_NAME_LENGTH, canImport, parseItemLines } from '../bulkAdd';
import { useI18n } from '../i18n/context';
import type { Item } from '../swiss';

type Props = {
  open: boolean;
  items: Item[];
  onImport: (names: string[]) => void;
  onCancel: () => void;
};

/** Popup with a textbox for adding many items at once, one per line. */
export function ImportListDialog({ open, items, onImport, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="confirm import-list"
      aria-labelledby="import-list-title"
      onCancel={(e) => {
        // Escape key: close through React state.
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // Click on the backdrop (outside the dialog box) cancels.
        if (e.target === ref.current) onCancel();
      }}
    >
      {/* Mounted only while open, so the textbox starts empty every time. */}
      {open && <ImportListForm items={items} onImport={onImport} onCancel={onCancel} />}
    </dialog>
  );
}

function ImportListForm({ items, onImport, onCancel }: Omit<Props, 'open'>) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const result = useMemo(() => parseItemLines(text, items), [text, items]);
  const ok = canImport(result);
  const hasInput = text.trim().length > 0;

  const submit = () => {
    if (ok) onImport(result.names);
  };

  return (
    <>
      <h2 id="import-list-title">{t.importListTitle}</h2>
      <p>{t.importListHint}</p>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Ctrl/Cmd+Enter imports; plain Enter adds a new line.
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={t.importListPlaceholder}
        aria-label={t.importListTitle}
        aria-invalid={hasInput && !ok}
        aria-describedby="import-list-status"
        rows={8}
      />
      <div id="import-list-status" aria-live="polite">
        {result.tooMany && <p className="hint error">{t.importListTooMany(MAX_LINES)}</p>}
        {result.tooLong.length > 0 && (
          <p className="hint error">{t.importListTooLong(MAX_NAME_LENGTH, result.tooLong.length)}</p>
        )}
        {result.duplicates.length > 0 && <p className="hint">{t.importListDuplicates(result.duplicates.length)}</p>}
        {hasInput && result.names.length === 0 && result.tooLong.length === 0 && (
          <p className="hint error">{t.importListNothingNew}</p>
        )}
      </div>
      <div className="actions">
        <button type="button" onClick={onCancel}>
          {t.cancel}
        </button>
        <button type="button" className="primary" disabled={!ok} onClick={submit}>
          {t.importListConfirm(ok ? result.names.length : 0)}
        </button>
      </div>
    </>
  );
}
