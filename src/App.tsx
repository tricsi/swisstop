import { useCallback } from 'react';
import { DuelStep } from './components/DuelStep';
import { ResultsStep } from './components/ResultsStep';
import { SetupStep } from './components/SetupStep';
import { DataTools } from './components/DataTools';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { StepNav } from './components/StepNav';
import { ThemeToggle } from './components/ThemeToggle';
import { useI18n } from './i18n/context';
import { useTournament, type Step } from './useTournament';

export default function App() {
  const { t } = useI18n();
  const [state, dispatch] = useTournament();
  const { step, items, tournament, history } = state;

  const goTo = useCallback((s: Step) => dispatch({ type: 'goTo', step: s }), [dispatch]);
  const pick = useCallback((winnerId: string) => dispatch({ type: 'pick', winnerId }), [dispatch]);
  const undo = useCallback(() => dispatch({ type: 'undo' }), [dispatch]);

  return (
    <main className="app">
      <header>
        <div className="header-bar">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <h1>{t.appTitle}</h1>
        <p className="tagline">{t.tagline}</p>
      </header>

      <StepNav current={step} started={tournament !== null} onSelect={goTo} />

      {step === 'setup' || !tournament ? (
        <SetupStep
          items={items}
          started={tournament !== null}
          onAdd={(name) => dispatch({ type: 'addItem', name })}
          onRemove={(id) => dispatch({ type: 'removeItem', id })}
          onStart={() => dispatch({ type: 'start' })}
          onContinue={() => goTo('duel')}
        />
      ) : step === 'duel' ? (
        <DuelStep
          tournament={tournament}
          canUndo={history.length > 0}
          onPick={pick}
          onUndo={undo}
          onResults={() => goTo('results')}
        />
      ) : (
        <ResultsStep
          tournament={tournament}
          onContinue={() => goTo('duel')}
          onReset={() => dispatch({ type: 'reset' })}
        />
      )}

      <DataTools state={state} onLoad={(data) => dispatch({ type: 'load', data })} />
    </main>
  );
}
