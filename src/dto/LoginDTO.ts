import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDTO {
  @IsEmail()
  readonly email: string;

  @IsString()
  readonly password: string;

  @IsBoolean()
  @IsOptional()
  isEmailVerified: boolean;

  @IsString()
  @IsOptional()
  jwt?: string;
}
