import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entity/User.entity';
import { ConnectionController } from './connection.controller';
import { ConnectionService } from './connection.service';
import {JwtService} from "@nestjs/jwt";
import {Repository} from "typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [ConnectionController],
  providers: [Repository,ConnectionService, JwtService],
})
export class ConnectionModule {}
