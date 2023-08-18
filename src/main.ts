import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from "cookie-parser";
async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    logger: console
  });
  app.use(cookieParser());
  app.enableCors({
    allowedHeaders: '*',
    origin: '*',
    credentials:true
  });
  await console.log("ok")
  await app.listen(3004);
}
bootstrap();
