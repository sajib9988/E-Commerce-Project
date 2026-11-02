import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ReservationExpiryWorker } from './reservation-expiry.worker';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'reservation-expiry' }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, ReservationExpiryWorker],
  exports: [OrdersService],
})
export class OrdersModule {}
