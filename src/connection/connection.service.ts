import {Injectable} from '@nestjs/common';
import {UserDTO} from "../dto/UserDTO";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {User} from "../entity/User.entity";
import * as bcrypt from 'bcrypt';

@Injectable()
export class ConnectionService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>
    ) {
    }


    async signup(user: UserDTO) {
        const userCreate = user;
        const saltOrRounds = 10;
        const password = userCreate.password;
        const hash = await bcrypt.hash(password, saltOrRounds);
        userCreate.password = hash
        await this.userRepository.save(userCreate);
    }
}
