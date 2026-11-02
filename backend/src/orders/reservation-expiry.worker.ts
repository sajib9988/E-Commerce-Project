import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';

const BATCH_SIZE = 50;

/**
 * Single-process safety worker for expired unpaid reservations.
 * The database transition RESERVED -> RELEASED is the concurrency guard,
 * so overlapping instances cannot restock the same reservation twice.
 * Replace the polling trigger with BullMQ when the Redis stage is implemented.
 */
@Injectable()
export class ReservationExpiryWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(ReservationExpiryWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    @InjectQueue('reservation-expiry') private readonly queue: Queue,
  ) { super(); }

  async onModuleInit() {
    await this.queue.add('scan-expired-reservations', {}, {
      jobId: 'reservation-expiry-repeat', repeat: { every: 30_000 },
      removeOnComplete: 100, removeOnFail: 500,
    });
    await this.queue.add('scan-expired-reservations', {}, {
      jobId: `reservation-expiry-start-${Date.now()}`, removeOnComplete: true,
    });
  }

  async process(_job: Job): Promise<void> {
    await this.runOnce();
  }

  async runOnce() {
    try {
      const expired = await this.prisma.stockReservation.findMany({
        where: { status: 'RESERVED', expiresAt: { lte: new Date() } },
        select: { orderId: true },
        orderBy: { expiresAt: 'asc' },
        take: BATCH_SIZE,
      });

      for (const { orderId } of expired) {
        try {
          await this.prisma.$transaction(async (tx) => {
            const reservation = await tx.stockReservation.findUnique({ where: { orderId } });
            if (!reservation || reservation.status !== 'RESERVED' || reservation.expiresAt > new Date()) return;

            const paidAttempt = await tx.paymentAttempt.findFirst({
              where: { orderId, status: 'SUCCEEDED' },
              select: { id: true },
            });
            if (paidAttempt) return;

            await this.orders.releaseReservations(tx, orderId);
            await tx.order.updateMany({
              where: { id: orderId, status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' },
              data: { status: 'CANCELLED' },
            });
          }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 });
        } catch (error) {
          this.logger.error(`Failed to expire reservation for order ${orderId}`, error instanceof Error ? error.stack : String(error));
        }
      }
    } catch (error) {
      this.logger.error('Reservation expiry scan failed', error instanceof Error ? error.stack : String(error));
    }
  }
}
