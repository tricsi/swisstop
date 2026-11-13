import { useEffect, useMemo } from 'react';
import { useI18n } from '../i18n/context';
import { recommendedRounds, type TournamentState } from '../swiss';

type Props = {
  tournament: TournamentState;
  canUndo: boolean;
  onPick: (winnerId: string) => void;
  onUndo: () => void;
  onResults: () => void;
};

export function DuelStep({ tournament, canUndo, onPick, onUndo, onResults }: Props) {
  const { t } = useI18n();
  const { items, pending, round, matches, complete } = tournament;
  const names = useMemo(() => new Map(items.map((i) => [i.id, i.name])), [items]);
  const match = pending[0];
  const recommended = recommendedRounds(items.length);

  const roundTotal = matches.filter((m) => m.round === round && m.b !== null).length + pending.length;
  const matchNo = roundTotal - pending.length + 1;
  const bye = matches.find((m) => m.round === round && m.b === null);

  useEffect(() => {
    if (!match) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft') onPick(match.a);
      else if (e.key === 'ArrowRight' && match.b) onPick(match.b);
      else if ((e.key === 'z' && (e.ctrlKey || e.metaKey)) || e.key === 'Backspace') onUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [match, onPick, onUndo]);

  if (complete || !match) {
    return (
      <section className="card center">
        <h2>{t.allDone}</h2>
        <p className="hint">{t.allDoneHint}</p>
        <div className="actions">
          <button type="button" onClick={onUndo} disabled={!canUndo}>
            {t.undoLast}
          </button>
          <button type="button" className="primary" onClick={onResults}>
            {t.seeTopList}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="duel-meta">
        <span>{round <= recommended ? t.roundRecommended(round, recommended) : t.roundExtra(round)}</span>
        <span>{t.matchOf(matchNo, roundTotal)}</span>
      </div>
      {round > recommended && <p className="hint">{t.pastRecommended}</p>}

      <h2 className="center">{t.whichIsBetter}</h2>
      <div className="duel">
        <button type="button" className="choice" onClick={() => onPick(match.a)}>
          {names.get(match.a)}
          <kbd>←</kbd>
        </button>
        <span className="vs">{t.vs}</span>
        <button type="button" className="choice" onClick={() => match.b && onPick(match.b)}>
          {match.b && names.get(match.b)}
          <kbd>→</kbd>
        </button>
      </div>
      {bye && <p className="hint center">{t.bye(names.get(bye.a) ?? '')}</p>}

      <div className="actions">
        <button type="button" onClick={onUndo} disabled={!canUndo}>
          {t.undo}
        </button>
        <button type="button" className="primary" onClick={onResults}>
          {t.seeTopList}
        </button>
      </div>
    </section>
  );
}
