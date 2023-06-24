import {Injectable, NotFoundException, UnauthorizedException,} from '@nestjs/common';
import {UserDTO} from '../dto/UserDTO';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {User} from '../entity/User.entity';
import {hash, compare} from "bcrypt";
import {LoginDTO} from '../dto/LoginDTO';

@Injectable()
export class ConnectionService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {
    }

    async signup(user: UserDTO) {
        const userCreate = user;
        let hashedPassword = await hash(user.password, 10);
        user.password=hashedPassword;
        await this.userRepository
            .save(userCreate)
            .catch((reason) => console.log(reason));
    }

    async login(
        user: LoginDTO,
    ): Promise<{ id: number; email: string; prenom: string; nom: string }> {
        const {password, email} = user;
        const userFind = await this.userRepository.findOneBy({email: email});
        if (!userFind) {
            throw new NotFoundException('User Not found');
        } else {
            let bool=await compare(user.password,userFind.password);
                if (!bool) {
                    throw new UnauthorizedException('illegal');
                } else {
                    return {
                        id: userFind.id,
                        email: userFind.email,
                        nom: userFind.nom,
                        prenom: userFind.prenom,
                    };
                }

        }
    }
}
