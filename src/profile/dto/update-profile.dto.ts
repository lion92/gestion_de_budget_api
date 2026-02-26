import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  jwt: string;

  @IsString()
  @IsOptional()
  nom?: string;

  @IsString()
  @IsOptional()
  prenom?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  address?: string;
}

export class ProfilePictureDto {
  @IsString()
  @IsOptional()
  jwt: string;

  @IsOptional()
  file?: any;
}

export class JwtDto {
  @IsString()
  @IsOptional()
  jwt: string;
}
