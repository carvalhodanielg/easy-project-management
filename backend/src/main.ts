import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { helmetOptions } from './common/security/helmet.config';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind the Nginx reverse proxy in production, trust the first hop so
  // ThrottlerGuard (and anything else reading the client IP) sees the real
  // client address from X-Forwarded-For instead of Nginx's own IP.
  app.set('trust proxy', 1);

  app.use(helmet(helmetOptions));

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;
  console.log("up")
  await app.listen(port);
  console.log(`AtkPlan API running on port ${port}`);
}
bootstrap();
