import { useI18n } from '../i18n/context';
import type { Messages } from '../i18n/messages';
import type { Step } from '../useTournament';

const STEPS: { step: Step; label: keyof Messages }[] = [
  { step: 'setup', label: 'stepItems' },
  { step: 'duel', label: 'stepCompare' },
  { step: 'results', label: 'stepResults' },
];

type Props = { current: Step; started: boolean; onSelect: (step: Step) => void };

export function StepNav({ current, started, onSelect }: Props) {
  const { t } = useI18n();
  return (
    <nav className="steps" aria-label={t.stepsLabel}>
      {STEPS.map(({ step, label }, i) => (
        <button
          key={step}
          type="button"
          className={step === current ? 'step active' : 'step'}
          aria-current={step === current ? 'step' : undefined}
          disabled={step !== 'setup' && !started}
          onClick={() => onSelect(step)}
        >
          <span className="step-num">{i + 1}</span>
          {t[label] as string}
        </button>
      ))}
    </nav>
  );
}
