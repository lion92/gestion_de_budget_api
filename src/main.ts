import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.use(cookieParser());

  const corsOrigins = (process.env.CORS_ORIGIN || 'https://www.krisscode.fr')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    origin: corsOrigins,
    credentials: true,
  });

  // Validation globale : rejette les champs inconnus et valide les types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // souple : ignore les champs inconnus sans erreur
      transform: true,
    }),
  );

  // Swagger disponible uniquement hors production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Budget API')
      .setDescription('API de gestion de budget')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  await app.listen(process.env.PORT || 3010);
}

bootstrap();
