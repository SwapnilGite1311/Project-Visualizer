// "method:app/services.py#UserService.get_user" → "UserService.get_user"; "module:app/utils.py" → "app/utils.py"
export function shortLabel(id: string): string {
  const hash = id.indexOf('#');
  if (hash >= 0) return id.slice(hash + 1);
  return id.slice(id.indexOf(':') + 1) || id;
}

export const kindOf = (id: string) => id.slice(0, id.indexOf(':'));
