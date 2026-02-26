import { IsNumber, IsOptional, IsString } from 'class-validator';
import { User } from '../entity/user.entity';
import { Categorie } from '../entity/categorie.entity';

export class ActionDTO {
  @IsNumber()
  @IsOptional()
  readonly id: number;

  @IsString()
  @IsOptional()
  description: string;

  @IsOptional()
  readonly dateAjout: Date;

  @IsOptional()
  dateTransaction: Date;

  @IsNumber()
  @IsOptional()
  montant: number;

  @IsOptional()
  user: User;

  @IsOptional()
  categorie: Categorie;

  @IsString()
  @IsOptional()
  jwt?: string;

  @IsString()
  @IsOptional()
  iconName?: string;
}
