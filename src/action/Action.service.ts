import {Injectable} from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {ActionDTO} from "../dto/ActionDTO";
import {Action} from "../entity/Action.entity";

@Injectable()
export class ActionService {
    constructor(
        @InjectRepository(Action)
        private actionRepository: Repository<Action>,
    ) {
    }

    findAll(): Promise<Action[]> {
        return this.actionRepository.find();
    }

    async findOneBy(id: number): Promise<Action | null> {
        return await this.actionRepository.findOneBy({id});
    }

    async delete(id: number) {
        await this.actionRepository.delete(id);
        console.log('1')
    }

    async create(actionDTO: ActionDTO) {
        await this.actionRepository.save(actionDTO)
    }

    async update(id: number, actionDTO: ActionDTO) {
        await this.actionRepository.update(id, {
            description: actionDTO.description,
            user: actionDTO.user,
            categorie: actionDTO.categorie,
            dateTransaction: actionDTO.dateTransaction
        })
    }

}
