import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Set this only when the origin is protected so clients cannot spoof X-Forwarded-For.
  // Configure TRUST_PROXY to the trusted proxy hop count (e.g. 1 behind Cloudflare).
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    const hops = Number(trustProxy);
    app.getHttpAdapter().getInstance().set('trust proxy', Number.isInteger(hops) && hops >= 0 ? hops : trustProxy);
  }

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const allowedOrigins = [
    process.env.ADMIN_ORIGIN,
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGINS ?? '').split(','),
  ].map((origin) => origin?.trim()).filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
