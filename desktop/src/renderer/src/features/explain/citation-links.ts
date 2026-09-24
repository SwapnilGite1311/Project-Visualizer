const PREFIX = '#pvnode=';

export function citationsToLinks(markdown: string, cited: { id: string; name: string }[]): string {
  const names = new Map(cited.map((c) => [c.id, c.name]));
  return markdown.replace(/\[\[node:(.+?)\]\]/g, (_marker, id: string) => {
    const name = names.get(id);
    return name === undefined ? '' : `[${name}](${PREFIX}${encodeURIComponent(id)})`;
  });
}

export function parseNodeHref(href: string): string | null {
  if (!href.startsWith(PREFIX)) return null;
  try {
    return decodeURIComponent(href.slice(PREFIX.length));
  } catch {
    return null;
  }
}
