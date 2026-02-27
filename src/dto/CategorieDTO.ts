import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { User } from '../entity/user.entity';
import Month from './enumMonth/Month';

export class CategorieDTO {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  readonly id: number;

  @IsString()
  @IsOptional()
  readonly categorie: string;

  @IsString()
  @IsOptional()
  readonly color: string;

  @IsOptional()
  readonly user: User;

  @IsOptional()
  readonly month: Month;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  readonly annee: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  readonly budgetDebutMois: number;

  @IsString()
  @IsOptional()
  jwt?: string;

  @IsString()
  @IsOptional()
  iconName?: string;
}
