import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminGuard } from '../guards/admin.guard';
import { User } from '../entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({}),
  ],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
