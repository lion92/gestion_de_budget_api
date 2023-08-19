import {User} from "../entity/User.entity";
import {Categorie} from "../entity/Categorie.entity";

export interface ActionInterfaceInterface {
    id: number
    description: string
    dateAjout: Date
    dateTransaction: Date
    montant: number
    user: User
    categorie: Categorie
}