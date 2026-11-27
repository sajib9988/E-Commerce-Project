import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { RedisModule } from '../redis/redis.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { FacebookOAuthGuard } from './guards/facebook-oauth.guard';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    PrismaModule,
    EmailModule,
    RedisModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    GoogleStrategy,
    FacebookOAuthGuard,

    {
      provide: FacebookStrategy,
      inject: [ConfigService, AuthService],
      useFactory: (
        config: ConfigService,
        authService: AuthService,
      ) => {
        const appId = config.get<string>('FACEBOOK_APP_ID');
        const appSecret = config.get<string>('FACEBOOK_APP_SECRET');

        if (!appId || !appSecret) {
          return null;
        }

        return new FacebookStrategy(config, authService);
      },
    },
  ],

  exports: [AuthService, JwtModule],
})
export class AuthModule {}