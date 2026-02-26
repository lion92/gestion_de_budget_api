import { IsOptional, IsString } from 'class-validator';
import { UserDTO } from './UserDTO';

export class TodoDTO {
  @IsString()
  @IsOptional()
  readonly title: string;

  @IsString()
  @IsOptional()
  readonly description: string;

  @IsOptional()
  readonly user: UserDTO;

  @IsOptional()
  readonly createdAt?: Date;

  @IsOptional()
  readonly updatedAt?: Date;

  @IsString()
  @IsOptional()
  jwt?: string;
}
