import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Action } from '../entity/Action.entity';
import { ActionController } from './Action.controller';
import { ActionService } from './Action.service';
import { JwtService } from '@nestjs/jwt';


@Module({
  imports: [TypeOrmModule.forFeature([Action])],
  controllers: [ActionController],
  providers: [ActionService, JwtService],
})
export class ActionModule {
}
