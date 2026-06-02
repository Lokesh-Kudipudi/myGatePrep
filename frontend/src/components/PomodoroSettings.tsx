import { useState } from 'react';
import Modal from './Modal';
import { usePomodoro } from '../store/usePomodoro';
import type { PomodoroSettings } from '../lib/types';
import styles from './PomodoroSettings.module.css';

interface Props {
  onClose: () => void;
}

export default function PomodoroSettingsModal({ onClose }: Props) {
  const settings = usePomodoro((s) => s.settings);
  const saveSettings = usePomodoro((s) => s.saveSettings);
  const [draft, setDraft] = useState<PomodoroSettings>(settings);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(draft);
    onClose();
  };

  const num = (k: keyof PomodoroSettings, min = 1, max = 240) => (
    <input
      type="number"
      min={min}
      max={max}
      value={draft[k] as number}
      onChange={(e) =>
        setDraft({ ...draft, [k]: Math.max(min, parseInt(e.target.value || '0', 10)) })
      }
    />
  );

  return (
    <Modal title="Pomodoro settings" onClose={onClose}>
      <form className={styles.form} onSubmit={handleSave}>
        <label>
          <span>Work (min)</span>
          {num('work_min')}
        </label>
        <label>
          <span>Short break (min)</span>
          {num('short_break_min')}
        </label>
        <label>
          <span>Long break (min)</span>
          {num('long_break_min')}
        </label>
        <label>
          <span>Long break after</span>
          {num('long_break_after', 1, 12)}
        </label>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={draft.sound_enabled}
            onChange={(e) => setDraft({ ...draft, sound_enabled: e.target.checked })}
          />
          <span>Sound on phase end</span>
        </label>
        <div className={styles.actions}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.save}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
