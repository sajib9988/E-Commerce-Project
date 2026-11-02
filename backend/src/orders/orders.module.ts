import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ReservationExpiryWorker } from './reservation-expiry.worker';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService, ReservationExpiryWorker],
  exports: [OrdersService],
})
export class OrdersModule {}
