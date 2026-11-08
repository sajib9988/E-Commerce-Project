import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CmsModule } from './cms/cms.module';
import { MediaModule } from './media/media.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ApliiqModule } from './apliiq/apliiq.module';
import { PaymentsModule } from './payments/payments.module';
import { CouponsModule } from './coupons/coupons.module';
import { CategoriesModule } from './categories/categories.module';
import { CollectionsModule } from './collections/collections.module';
import { CustomersModule } from './customers/customers.module';
import { VariantsModule } from './products/variants/variants.module';
import { SizeTemplatesModule } from './products/size-templates/size-templates.module';
import { ReviewsModule } from './reviews/reviews.module';
import { RefundsModule } from './refunds/refunds.module';
import { InventoryModule } from './inventory/inventory.module';
import { SettingsModule } from './settings/settings.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { PromotionModule } from './promotion/promotion.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { RedisModule } from './redis/redis.module';
import { RedisService } from './redis/redis.service';
import { RedisThrottlerStorage } from './redis/redis-throttler.storage';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ connection: { url: config.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379', maxRetriesPerRequest: null } }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redis: RedisService) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    CmsModule,
    HealthModule,
    MediaModule,
    ProductsModule,
    OrdersModule,
    ApliiqModule,
    PaymentsModule,
    CouponsModule,
    CategoriesModule,
    CollectionsModule,
    CustomersModule,
    VariantsModule,
    SizeTemplatesModule,
    ReviewsModule,
    RefundsModule,
    InventoryModule,
    SettingsModule,
    AnalyticsModule,
    AiModule,
    PromotionModule,
    NewsletterModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
