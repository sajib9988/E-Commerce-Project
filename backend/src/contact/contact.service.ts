import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactDto) {
    await this.prisma.contactSubmission.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        subject: dto.subject.trim(),
        message: dto.message.trim(),
      },
    });

    return {
      success: true,
      message: 'Your message has been received. We will get back to you soon.',
    };
  }

  findAll() {
    return this.prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async updateStatus(id: string, status: ContactStatus) {
    const existing = await this.prisma.contactSubmission.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Contact submission not found');
    }

    return this.prisma.contactSubmission.update({
      where: { id },
      data: { status },
    });
  }
}
