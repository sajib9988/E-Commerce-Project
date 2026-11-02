import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieSession from 'cookie-session';
import passport from 'passport';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api/v1');

  // Passport's OAuth state store uses req.session. cookie-session signs the
  // small temporary state payload so OAuth callbacks can validate CSRF state.
  app.use(
    cookieSession({
      name: 'oauth_session',
      keys: [process.env.OAUTH_SESSION_SECRET || process.env.JWT_SECRET || 'local-development-only-change-me'],
      maxAge: 10 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    }),
  );
  app.use(passport.initialize());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: [process.env.ADMIN_ORIGIN, process.env.STOREFRONT_ORIGIN].filter(Boolean),
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
