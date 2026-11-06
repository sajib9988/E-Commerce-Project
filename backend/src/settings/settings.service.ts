import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() { return this.prisma.storeSetting.findMany({ orderBy: { key: 'asc' } }); }
  update(key: string, value: unknown, actorId: string) {
    return this.prisma.storeSetting.upsert({
      where: { key },
      create: { key, value: value as object, updatedById: actorId },
      update: { value: value as object, updatedById: actorId },
    });
  }
}