import { User } from '../entity/user.entity';
import { Categorie } from '../entity/categorie.entity';

export class ActionDTO {
  readonly id: number;
  description: string;
  readonly dateAjout: Date;
  dateTransaction: Date;
  montant: number;
  user: User;
  categorie: Categorie;
  jwt?: string;
  iconName?:string
}