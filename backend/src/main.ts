import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import session from 'express-session';
import passport from 'passport';
import RedisStore from 'connect-redis';
import { RedisService } from './redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Set this only when the origin is protected so clients cannot spoof X-Forwarded-For.
  // Configure TRUST_PROXY to the trusted proxy hop count (e.g. 1 behind Cloudflare).
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    const hops = Number(trustProxy);
    app.getHttpAdapter().getInstance().set('trust proxy', Number.isInteger(hops) && hops >= 0 ? hops : trustProxy);
  }

  app.use(helmet());
  // Store Passport's short-lived OAuth state in Redis, not process memory.
  const redis = app.get(RedisService);
  const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!sessionSecret) throw new Error('SESSION_SECRET or JWT_SECRET must be configured');
  app.use(session({
    store: new RedisStore({ client: redis.client as never, prefix: 'oauth:sess:', ttl: 300 }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    },
  }));
  app.use(passport.initialize());
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

  await app.listen(Number(process.env.PORT) || 5000);
}
bootstrap();
