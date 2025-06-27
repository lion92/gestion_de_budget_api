import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodosModule } from './todos/todos.module';
import { ConnectionModule } from './connection/connection.module';
import { categorieModule } from './categorie/Categorie.module';
import { SpendModule } from './spend/SpendModule';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RevenueModule } from './revenue/revenue.module';
import * as dotenv from 'dotenv';
import { TransactionsModule } from './transactions/transaction/transactions.module';
import { EnvelopesModule } from './envelopes/envelopes.module';
import { TicketModule } from './ticket/ticket.module'; // ✅ AJOUT ICI
import { CategoryImagesModule } from './category-images/category-images.module';

dotenv.config();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MulterModule.register({ dest: './uploads' }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: '',
        database: 'crud_nest',
        entities: ['dist/**/*.entity.js'],
        synchronize: true,
      }),
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('secret'),
        signOptions: { expiresIn: '1d' },
      }),
    }),

    // ✅ Modules applicatifs
    TicketModule, // ✅ INSÉRÉ ICI
    TodosModule,
    ConnectionModule,
    categorieModule,
    SpendModule,
    RevenueModule,
    TransactionsModule,
    EnvelopesModule,
    CategoryImagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}