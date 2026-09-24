const CITATION = /\[\[node:(.+?)\]\]/g;

export function extractCitationIds(text: string): string[] {
  const ids: string[] = [];
  for (const match of text.matchAll(CITATION)) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }
  return ids;
}

export function cleanCitations(
  text: string,
  valid: Map<string, string>,
): { text: string; cited: { id: string; name: string }[] } {
  const cited: { id: string; name: string }[] = [];
  const cleaned = text.replace(/ ?\[\[node:(.+?)\]\]/g, (marker, id: string) => {
    const name = valid.get(id);
    if (name === undefined) return '';
    if (!cited.some((c) => c.id === id)) cited.push({ id, name });
    return marker;
  });
  return { text: cleaned, cited };
}
