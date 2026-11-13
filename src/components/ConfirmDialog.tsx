import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/context';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** In-page confirmation popup (native window.confirm is blocked in some embedded browsers). */
export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  const { t } = useI18n();
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
      className="confirm"
      aria-labelledby="confirm-title"
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
      <h2 id="confirm-title">{title}</h2>
      <p>{message}</p>
      <div className="actions">
        <button type="button" autoFocus onClick={onCancel}>
          {t.cancel}
        </button>
        <button type="button" className={danger ? 'primary danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
