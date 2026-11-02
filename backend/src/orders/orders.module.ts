import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ReservationExpiryWorker } from './reservation-expiry.worker';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379',
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue({ name: 'reservation-expiry' }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, ReservationExpiryWorker],
  exports: [OrdersService],
})
export class OrdersModule {}
