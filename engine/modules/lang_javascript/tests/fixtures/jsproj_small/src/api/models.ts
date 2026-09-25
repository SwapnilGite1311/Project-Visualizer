export interface Entity {
  id: number;
}

export class BaseModel implements Entity {
  id = 0;
}

export class User extends BaseModel {
  name = '';
}
