import { formatName } from '../utils/format';

export class ApiClient {
  base = 'https://example.com';

  fetchUser(id: number) {
    return this.request('/users/' + id);
  }

  request(path: string) {
    return formatName(path);
  }
}

export function fetchUser(id: number) {
  const client = new ApiClient();
  return client.fetchUser(id);
}
