import { usePlainWordsStore } from './plain-store';
import { glossary } from './terms';

// Settings → Words: simple words on or off, and what every word means.
export function PlainSettings() {
  const simple = usePlainWordsStore((s) => s.simple);
  const setSimple = usePlainWordsStore((s) => s.setSimple);
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 560 }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <input type="checkbox" checked={simple} onChange={(e) => void setSimple(e.target.checked)} />
        <span>
          <strong>Use simple words</strong>
          <br />
          <span style={{ color: 'var(--fg-muted)' }}>
            For example "File" instead of "module" and "Used by" instead of "fan-in". Turn off to see the exact developer
            terms.
          </span>
        </span>
      </label>
      <div>
        <strong>Glossary</strong>
        <table aria-label="Glossary" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--fg-muted)' }}>
              <th style={{ padding: '4px 6px' }}>Developer word</th>
              <th style={{ padding: '4px 6px' }}>Simple word</th>
              <th style={{ padding: '4px 6px' }}>What it means</th>
            </tr>
          </thead>
          <tbody>
            {glossary().map((r) => (
              <tr key={r.word} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                  <code>{r.word}</code>
                </td>
                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{r.simple}</td>
                <td style={{ padding: '4px 6px' }}>{r.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
