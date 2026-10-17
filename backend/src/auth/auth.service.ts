import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../../generated/prisma/client';
import { UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { comparePassword, hashPassword } from '../common/utils/password.util';
import { compareOtp, generateOtp, hashOtp } from '../common/utils/otp.util';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import type { RefreshDto } from './dto/refresh.dto';
import type { ResendOtpDto } from './dto/resend-otp.dto';
import type { VerifyEmailDto } from './dto/verify-email.dto';
import type { ResendVerificationDto } from './dto/resend-verification.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

export const ACCESS_TOKEN_TTL_SECONDS = 30 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const CHALLENGE_TOKEN_TTL_SECONDS = OTP_TTL_SECONDS;

type OtpAttemptState = { count: number; resetAt: number };

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthService {
  private readonly otpAttempts = new Map<string, OtpAttemptState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        password: await hashPassword(dto.password),
        role: UserRole.USER,
      },
    });

    await this.issueAndSendOtp(user.id, user.email, 'verify-email');
    return { success: true, message: 'Account created. Check your email for the verification code.' };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.emailVerified) {
      throw new ForbiddenException('Please verify your email before logging in');
    }

    if (user.role === UserRole.USER) {
      return this.issueSessionTokens(user);
    }

    await this.issueAndSendOtp(user.id, user.email, 'login');
    const challengeToken = this.signToken(
      { sub: user.id, email: user.email, name: user.name, role: user.role },
      'otp-challenge',
      CHALLENGE_TOKEN_TTL_SECONDS,
    );
    return { challengeToken, requiresOtp: true };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Invalid email or verification code');
    if (user.emailVerified) return { success: true, message: 'Email is already verified' };
    if (!user.verificationCode || !user.verificationCodeExpiresAt ||
        user.verificationCodeExpiresAt.getTime() < Date.now() ||
        !compareOtp(dto.otp, user.verificationCode)) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationCode: null, verificationCodeExpiresAt: null },
    });
    this.otpAttempts.delete(user.id);
    return { success: true, message: 'Email verified. You can now log in.' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Keep the response neutral so callers cannot use this endpoint to enumerate accounts.
    if (!user || user.emailVerified) {
      return { success: true, message: 'If verification is required, a code has been sent.' };
    }
    this.assertResendAllowed(user.verificationCodeExpiresAt);
    await this.issueAndSendOtp(user.id, user.email, 'verify-email');
    return { success: true, message: 'If verification is required, a code has been sent.' };
  }

  async resendOtp(dto: ResendOtpDto) {
    const payload = this.verifyChallengeToken(dto.challengeToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.role === UserRole.USER) {
      throw new UnauthorizedException('Session expired or invalid');
    }
    this.assertResendAllowed(user.verificationCodeExpiresAt);
    await this.issueAndSendOtp(user.id, user.email, 'login');
    return { success: true, message: 'A new code has been sent.' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const payload = this.verifyChallengeToken(dto.challengeToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.role === UserRole.USER) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    this.checkAttemptLimit(user.id);
    if (!user.verificationCode || !user.verificationCodeExpiresAt ||
        user.verificationCodeExpiresAt.getTime() < Date.now()) {
      this.otpAttempts.delete(user.id);
      throw new UnauthorizedException('Code expired — request a new one');
    }
    if (!compareOtp(dto.code, user.verificationCode)) {
      this.recordFailedAttempt(user.id);
      throw new UnauthorizedException('Incorrect code');
    }

    this.otpAttempts.delete(user.id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: null, verificationCodeExpiresAt: null },
    });
    return this.issueSessionTokens(user);
  }

  async forgetPassword(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const code = generateOtp();
      await this.prisma.user.update({
        where: { id: user.id },
        data: { resetToken: hashOtp(code), resetTokenExpiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000) },
      });
      await this.emailService.sendOtp(user.email, code, 'reset-password');
    }
    return { success: true, message: 'If the account exists, a password reset code has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetToken || !user.resetTokenExpiresAt ||
        user.resetTokenExpiresAt.getTime() < Date.now() ||
        !compareOtp(dto.otp, user.resetToken)) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(dto.newPassword), resetToken: null, resetTokenExpiresAt: null,
        verificationCode: null, verificationCodeExpiresAt: null },
    });
    this.otpAttempts.delete(user.id);
    return { success: true, message: 'Password reset successfully.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await comparePassword(dto.currentPassword, user.password))) {
      throw new BadRequestException('Current password is incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(dto.newPassword), resetToken: null, resetTokenExpiresAt: null },
    });
    return { success: true, message: 'Password changed successfully.' };
  }

  async refresh(dto: RefreshDto) {
    let payload: AuthTokenPayload;
    try {
      payload = this.jwtService.verify<AuthTokenPayload>(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
    if (payload.purpose !== 'refresh') throw new UnauthorizedException('Wrong token type');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.emailVerified) throw new UnauthorizedException('Session expired or invalid');
    return this.issueSessionTokens(user);
  }

  async logout() {
    // Access/refresh JWTs are stateless; frontend must delete both HttpOnly cookies.
    return { success: true, message: 'Logged out. Clear the accessToken and refreshToken cookies.' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, emailVerified: true },
    });
    if (!user) throw new UnauthorizedException('Session expired or invalid');
    return user;
  }

  async findAllUsers(params: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const search = params.search?.trim();
    const where: Prisma.UserWhereInput = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: safeUserSelect, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.user.count({ where }),
    ]);
    return { success: true, data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOneUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: safeUserSelect });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('A user with this email already exists');
    }
    return this.prisma.user.create({
      data: { name: dto.name.trim(), email, password: await hashPassword(dto.password), role: dto.role ?? UserRole.USER, emailVerified: true },
      select: safeUserSelect,
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    await this.findOneUser(id);
    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const duplicate = await this.prisma.user.findUnique({ where: { email } });
      if (duplicate && duplicate.id !== id) throw new ConflictException('A user with this email already exists');
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.email !== undefined && { email: dto.email.trim().toLowerCase(), emailVerified: false }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.password !== undefined && { password: await hashPassword(dto.password) }),
      },
      select: safeUserSelect,
    });
  }

  async updateUserRole(id: string, role: UserRole) {
    await this.findOneUser(id);
    return this.prisma.user.update({ where: { id }, data: { role }, select: safeUserSelect });
  }

  async removeUser(id: string) {
    await this.findOneUser(id);
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  private async issueAndSendOtp(userId: string, email: string, purpose: 'verify-email' | 'login') {
    const code = generateOtp();
    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationCode: hashOtp(code), verificationCodeExpiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000) },
    });
    await this.emailService.sendOtp(email, code, purpose);
  }

  private assertResendAllowed(expiresAt: Date | null) {
    const issuedAt = expiresAt ? expiresAt.getTime() - OTP_TTL_SECONDS * 1000 : 0;
    const elapsed = (Date.now() - issuedAt) / 1000;
    if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
      throw new BadRequestException(`Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed)}s before requesting another code`);
    }
  }

  private checkAttemptLimit(userId: string) {
    const attempt = this.otpAttempts.get(userId);
    if (attempt && attempt.count >= OTP_MAX_ATTEMPTS && attempt.resetAt > Date.now()) {
      throw new ForbiddenException('Too many incorrect attempts. Request a new code.');
    }
  }

  private recordFailedAttempt(userId: string) {
    const attempt = this.otpAttempts.get(userId);
    this.otpAttempts.set(userId, {
      count: (attempt?.count ?? 0) + 1,
      resetAt: attempt?.resetAt ?? Date.now() + OTP_TTL_SECONDS * 1000,
    });
  }

  private issueSessionTokens(user: {
    id: string;
    email: string;
    name: string;
    role: AuthTokenPayload['role'];
  }) {
    const base = { sub: user.id, email: user.email, name: user.name, role: user.role };
    return {
      accessToken: this.signToken(base, 'access', ACCESS_TOKEN_TTL_SECONDS),
      refreshToken: this.signToken(base, 'refresh', REFRESH_TOKEN_TTL_SECONDS),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  private signToken(base: Omit<AuthTokenPayload, 'purpose'>, purpose: AuthTokenPayload['purpose'], expiresInSeconds: number) {
    const payload: AuthTokenPayload = { ...base, purpose };
    return this.jwtService.sign(payload, { expiresIn: expiresInSeconds });
  }

  private verifyChallengeToken(token: string): AuthTokenPayload {
    let payload: AuthTokenPayload;
    try {
      payload = this.jwtService.verify<AuthTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Login session expired — start again');
    }
    if (payload.purpose !== 'otp-challenge') throw new UnauthorizedException('Wrong token type');
    return payload;
  }
}
