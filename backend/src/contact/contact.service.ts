import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ContactStatus } from '../../generated/prisma/enums';
import { verifyTurnstileToken } from '../common/utils/turnstile.util';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async create(dto: CreateContactDto) {
    const turnstileValid = await verifyTurnstileToken(dto.turnstileToken);
    if (!turnstileValid) {
      throw new BadRequestException('Security verification failed. Please try again.');
    }

    const submission = await this.prisma.contactSubmission.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        subject: dto.subject.trim(),
        message: dto.message.trim(),
      },
    });

    // Persist the inquiry first. Email delivery is asynchronous and must not
    // make the customer lose a successfully saved message.
    try {
      await this.email.sendContactInquiry({
        id: submission.id,
        name: submission.name,
        email: submission.email,
        phone: submission.phone,
        subject: submission.subject,
        message: submission.message,
        createdAt: submission.createdAt.toISOString(),
      });
    } catch (error) {
      this.logger.error('Contact inquiry saved, but notification could not be queued', error);
    }

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
