import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/context';
import { computeStandings, type TournamentState } from '../swiss';
import { ConfirmDialog } from './ConfirmDialog';

type Props = {
  tournament: TournamentState;
  onContinue: () => void;
  onReset: () => void;
};

export function ResultsStep({ tournament, onContinue, onReset }: Props) {
  const { t } = useI18n();
  const [confirmReset, setConfirmReset] = useState(false);
  const rows = useMemo(() => computeStandings(tournament.items, tournament.matches), [tournament]);
  const played = tournament.matches.filter((m) => m.b !== null).length;

  // Items with identical score and Buchholz share a rank.
  const ranked = useMemo(
    () =>
      rows.reduce<(typeof rows[number] & { rank: number })[]>((acc, r, i) => {
        const prev = acc[i - 1];
        const tied = prev && prev.score === r.score && prev.buchholz === r.buchholz;
        acc.push({ ...r, rank: tied ? prev.rank : i + 1 });
        return acc;
      }, []),
    [rows],
  );

  return (
    <section className="card">
      <h2>{t.resultsHeading}</h2>
      <p className="hint">
        {t.basedOn(played)}
        {tournament.complete ? t.allCompared : t.keepComparing}
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th className="name">{t.colItem}</th>
              <th title={t.colScoreTitle}>{t.colScore}</th>
              <th title={t.colWinLossTitle}>{t.colWinLoss}</th>
              <th title={t.colTiebreakTitle}>{t.colTiebreak}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => (
              <tr key={r.item.id} className={r.rank <= 3 ? `top top-${r.rank}` : undefined}>
                <td>{r.rank}</td>
                <td className="name">{r.item.name}</td>
                <td>{r.score}</td>
                <td>
                  {r.wins}–{r.losses}
                  {r.byes > 0 && <span className="bye-note"> {t.byeNote(r.byes)}</span>}
                </td>
                <td>{r.buchholz}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="actions">
        <button type="button" onClick={() => setConfirmReset(true)}>
          {t.startOver}
        </button>
        {!tournament.complete && (
          <button type="button" className="primary" onClick={onContinue}>
            {t.continueComparing}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title={t.startOverTitle}
        message={t.startOverMessage}
        confirmLabel={t.startOverConfirm}
        danger
        onConfirm={() => {
          setConfirmReset(false);
          onReset();
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </section>
  );
}
