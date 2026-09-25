// Plain-language basics for common error types, offline (AI explanations come later).
import dictionary from './dictionary.json';

export interface BasicExplanation {
  title: string;
  plain: string;
  causes: string[];
}

const entries = dictionary as Record<string, BasicExplanation>;

export function explainBasic(language: string, type: string): BasicExplanation {
  // Go panics carry their message in the type ("panic: runtime error: ..."), so they match on the word alone.
  const key = language === 'go' && type.startsWith('panic') ? 'go:panic' : `${language}:${type}`;
  if (entries[key]) return entries[key];
  // Errors without a readable stack have language "unknown": use the entry of any language with that type.
  const any =
    language === 'unknown' ? Object.keys(entries).find((k) => k.endsWith(':' + type)) : undefined;
  return (
    (any && entries[any]) || {
      title: type,
      plain: 'The program stopped because of an error of type ' + type + '.',
      causes: [],
    }
  );
}

export const dictionaryEntries = (): Record<string, BasicExplanation> => entries;
