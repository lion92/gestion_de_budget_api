import {Injectable, NotFoundException, UnauthorizedException,} from '@nestjs/common';
import {UserDTO} from '../dto/UserDTO';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {User} from '../entity/User.entity';
import {compare, hash} from "bcrypt";
import {LoginDTO} from '../dto/LoginDTO';
import {JwtService} from "@nestjs/jwt";

@Injectable()
export class ConnectionService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService
    ) {
    }

    async signup(user: UserDTO, res) {
        const userCreate = user;
        let hashedPassword = await hash(user.password, 10);
        user.password = hashedPassword;
        const jwt = await this.jwtService.signAsync({id: user.id},{secret:"Je veux pas donner mon mot de passe"});


        res.cookie('jwt', jwt, {httpOnly: true});
        await this.userRepository
            .save(userCreate)
            .catch((reason) => console.log(reason));
    }

    async login(
        user: LoginDTO,res
    ): Promise<{ id: number; email: string; prenom: string; nom: string }> {
        const {password, email} = user;
        const userFind = await this.userRepository.findOneBy({email: email});
        if (!userFind) {
            throw new NotFoundException('User Not found');
        } else {
            let bool = await compare(user.password, userFind.password);
            if (!bool) {
                throw new UnauthorizedException('illegal');
            } else {
                const jwt = await this.jwtService.signAsync({id: userFind.id},{secret:"Je veux pas donner mon mot de passe"});

                res.cookie('jwt', jwt, {httpOnly: true});
                return {
                    id: userFind.id,
                    email: userFind.email,
                    nom: userFind.nom,
                    prenom: userFind.prenom,
                };
            }

        }
    }

    async update(id: number, userDTO: UserDTO) {
        await this.userRepository.update(id, {nom: userDTO.nom, prenom: userDTO.prenom})
    }
}
