import { UserDTO } from './UserDTO';

export class TodoDTO {
  readonly title: string;
  readonly description: string;
  readonly user: UserDTO;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
  jwt?: string;

}