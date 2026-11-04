import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ApliiqClient } from './apliiq.client';
import { ApliiqService } from './apliiq.service';
import { ApliiqWebhookController } from './apliiq-webhook.controller';
import { ApliiqAdminController } from './apliiq-admin.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BullModule.registerQueue({ name: 'apliiq-fulfillment' }),
  ],
  controllers: [ApliiqWebhookController, ApliiqAdminController],
  providers: [ApliiqClient, ApliiqService],
  exports: [ApliiqService],
})
export class ApliiqModule {}
