import { IsBoolean, IsDate, IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UserDTO {
  @IsNumber()
  @IsOptional()
  readonly id: number;

  @IsEmail()
  @IsOptional()
  readonly email: string;

  @IsString()
  @IsOptional()
  password: string;

  @IsString()
  @IsOptional()
  readonly nom: string;

  @IsString()
  @IsOptional()
  readonly prenom: string;

  @IsBoolean()
  @IsOptional()
  isEmailVerified: boolean;

  @IsString()
  @IsOptional()
  jwt?: string;

  @IsString()
  @IsOptional()
  resetPasswordToken?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  resetPasswordExpire?: Date;
}
