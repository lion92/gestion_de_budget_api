import {User} from "../entity/User.entity";
import {Categorie} from "../entity/Categorie.entity";

export class ActionDTO {
    readonly id: number
    readonly description: string
    readonly dateAjout: Date
    readonly dateTransaction: Date
    readonly montant: number
    readonly user: User
    readonly categorie: Categorie
}