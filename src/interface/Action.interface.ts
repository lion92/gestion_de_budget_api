import { User } from '../entity/user.entity';
import { Categorie } from '../entity/categorie.entity';

export interface ActionInterfaceInterface {
  id: number;
  description: string;
  dateAjout: Date;
  dateTransaction: Date;
  montant: number;
  user: User;
  categorie: Categorie;
}