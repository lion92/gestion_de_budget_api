import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    logger: console
  });
  app.enableCors({
    allowedHeaders: '*',
    origin: '*',
  });
  await console.log("ok")
  await app.listen(3004);
}
bootstrap();
