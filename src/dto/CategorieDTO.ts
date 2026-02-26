import { IsNumber, IsOptional, IsString } from 'class-validator';
import { User } from '../entity/user.entity';
import Month from './enumMonth/Month';

export class CategorieDTO {
  @IsNumber()
  @IsOptional()
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
  readonly annee: number;

  @IsNumber()
  @IsOptional()
  readonly budgetDebutMois: number;

  @IsString()
  @IsOptional()
  jwt?: string;

  @IsString()
  @IsOptional()
  iconName?: string;
}
