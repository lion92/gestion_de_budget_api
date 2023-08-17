import {User} from "../entity/User.entity";
import {Categorie} from "../entity/Categorie.entity";

export class CategorieDTO {
    readonly id: number
    readonly categorie:string
    readonly color:string
    readonly user:User


}