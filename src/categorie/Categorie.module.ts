import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Categorie} from "../entity/Categorie.entity";
import {CategorieController} from "./Categorie.controller";
import {CategorieService} from "./Categorie.service";
@Module({
    imports: [TypeOrmModule.forFeature([Categorie])],
    controllers: [CategorieController],
    providers: [CategorieService],
})
export class categorieModule {}
