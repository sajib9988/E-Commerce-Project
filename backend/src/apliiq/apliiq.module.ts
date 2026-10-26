import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { ApliiqClient } from './apliiq.client';
import { ApliiqService } from './apliiq.service';
import { ApliiqWebhookController } from './apliiq-webhook.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BullModule.registerQueue({ name: 'apliiq-fulfillment' }),
  ],
  controllers: [ApliiqWebhookController],
  providers: [ApliiqClient, ApliiqService],
  exports: [ApliiqService],
})
export class ApliiqModule {}
