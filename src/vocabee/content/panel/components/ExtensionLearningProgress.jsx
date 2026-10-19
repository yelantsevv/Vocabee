import styles from './ExtensionLearningProgress.module.css';

const MAX_LEVEL = 3;

export function ExtensionLearningProgress({ word, level = 0, onChange, disabled = false }) {
  if (!onChange) return null;

  const isLearned = level === MAX_LEVEL;
  const nextLevel = isLearned ? 0 : level + 1;
  const label = isLearned
    ? `«${word}» выучено. Нажмите, чтобы сбросить прогресс.`
    : level === 0
      ? `Добавить «${word}» в изучение`
      : `Повысить прогресс изучения «${word}» до ${nextLevel} из ${MAX_LEVEL}`;

  return (
    <button
      className={isLearned ? styles.learned : level === 0 ? styles.add : styles.progress}
      type="button"
      aria-label={label}
      aria-pressed={isLearned}
      title={label}
      disabled={disabled}
      style={level > 0 && !isLearned ? { '--progress-angle': `${level / MAX_LEVEL * 360}deg` } : undefined}
      onClick={() => onChange(isLearned ? 0 : nextLevel)}
    >
      {isLearned ? <span aria-hidden="true">✓</span> : level === 0 ? <span aria-hidden="true">+</span> : <span>{level}</span>}
    </button>
  );
}
