import {User} from "../entity/User.entity";
import Month from "./enumMonth/Month";


export class CategorieDTO {
    readonly id: number
    readonly categorie:string
    readonly color:string
    readonly user:User
    readonly month:Month
    readonly annee:number
    readonly budgetDebutMois:number
    jwt?: string


}