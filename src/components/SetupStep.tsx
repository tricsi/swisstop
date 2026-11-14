import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n/context';
import type { Item } from '../swiss';
import { ConfirmDialog } from './ConfirmDialog';
import { ImportListDialog } from './ImportListDialog';

type PendingChange =
  | { kind: 'add'; name: string }
  | { kind: 'addMany'; names: string[] }
  | { kind: 'remove'; id: string };

type Props = {
  items: Item[];
  started: boolean;
  onAdd: (name: string) => void;
  onAddMany: (names: string[]) => void;
  onRemove: (id: string) => void;
  onStart: () => void;
  onContinue: () => void;
};

export function SetupStep({ items, started, onAdd, onAddMany, onRemove, onStart, onContinue }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [importing, setImporting] = useState(false);
  const trimmed = name.trim();
  const duplicate = items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase());

  const apply = (change: PendingChange) => {
    if (change.kind === 'add') {
      onAdd(change.name);
      setName('');
    } else if (change.kind === 'addMany') {
      onAddMany(change.names);
    } else {
      onRemove(change.id);
    }
  };

  // Once comparisons exist, changing the list discards them, so ask first.
  const request = (change: PendingChange) => (started ? setPending(change) : apply(change));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || duplicate) return;
    request({ kind: 'add', name: trimmed });
  };

  return (
    <section className="card">
      <h2>{t.setupHeading}</h2>
      <form className="add-form" onSubmit={submit}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.itemPlaceholder}
          aria-label={t.itemNameLabel}
          maxLength={80}
        />
        <button type="submit" disabled={!trimmed || duplicate}>
          {t.add}
        </button>
        <button type="button" onClick={() => setImporting(true)}>
          {t.importList}
        </button>
      </form>
      {duplicate && trimmed && <p className="hint error">{t.duplicate(trimmed)}</p>}

      {items.length === 0 ? (
        <p className="hint">{t.noItems}</p>
      ) : (
        <ol className="item-list">
          {items.map((item) => (
            <li key={item.id}>
              <span>{item.name}</span>
              <button
                type="button"
                className="ghost"
                aria-label={t.remove(item.name)}
                onClick={() => request({ kind: 'remove', id: item.id })}
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="actions">
        {started ? (
          <button type="button" className="primary" onClick={onContinue}>
            {t.continueComparing}
          </button>
        ) : (
          <button type="button" className="primary" disabled={items.length < 2} onClick={onStart}>
            {t.startComparing(items.length)}
          </button>
        )}
      </div>

      <ImportListDialog
        open={importing}
        items={items}
        onImport={(names) => {
          setImporting(false);
          request({ kind: 'addMany', names });
        }}
        onCancel={() => setImporting(false)}
      />

      <ConfirmDialog
        open={pending !== null}
        title={t.changeListTitle}
        message={t.changeListMessage}
        confirmLabel={t.changeListConfirm}
        danger
        onConfirm={() => {
          if (pending) apply(pending);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}
