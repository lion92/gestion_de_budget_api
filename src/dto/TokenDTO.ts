import { IsString, IsOptional } from 'class-validator';

export class TokenDTO {
  @IsString()
  @IsOptional()
  readonly token: string;
}
