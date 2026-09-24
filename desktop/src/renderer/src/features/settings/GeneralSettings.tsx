import { useEffect, useState } from 'react';
import { getSetting, setSetting } from '../../api/main';
import { Select } from '../../ui/Select';
import { TextInput } from '../../ui/TextInput';
import { applyTheme, type ThemeChoice } from './theme';

export function GeneralSettings() {
  const [theme, setTheme] = useState<ThemeChoice>('system');
  const [excludes, setExcludes] = useState('');

  useEffect(() => {
    void (async () => {
      setTheme(await getSetting<ThemeChoice>('ui.theme', 'system'));
      setExcludes((await getSetting<string[]>('project.excludeGlobs', [])).join('\n'));
    })();
  }, []);

  const chooseTheme = (value: string) => {
    const choice = value as ThemeChoice;
    setTheme(choice);
    applyTheme(choice);
    void setSetting('ui.theme', choice);
  };

  const changeExcludes = (text: string) => {
    setExcludes(text);
    const globs = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');
    void setSetting('project.excludeGlobs', globs);
  };

  return (
    <div>
      <Select
        label="Theme"
        value={theme}
        options={[
          { value: 'system', label: 'Same as system' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        onChange={chooseTheme}
      />
      <TextInput label="Folders to skip (one pattern per line)" value={excludes} multiline onChange={changeExcludes} />
      <div style={{ color: 'var(--fg-muted)', fontSize: 12, marginTop: -6 }}>
        Example: tests/** — applies next time you open a project
      </div>
    </div>
  );
}
