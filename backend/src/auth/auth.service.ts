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
import { verifyTurnstileToken } from '../common/utils/turnstile.util';
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
import { createHash, randomBytes } from 'node:crypto';
import type { OAuthLoginDto } from './dto/oauth-login.dto';
import { RedisService } from '../redis/redis.service';

export const ACCESS_TOKEN_TTL_SECONDS = 30 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const CHALLENGE_TOKEN_TTL_SECONDS = OTP_TTL_SECONDS;

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const turnstileValid = await verifyTurnstileToken(dto.turnstileToken ?? '');
    if (!turnstileValid) throw new BadRequestException('Turnstile verification failed');
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
    await this.checkAttemptLimit(user.id);
    if (!user.verificationCode || !user.verificationCodeExpiresAt ||
        user.verificationCodeExpiresAt.getTime() < Date.now() ||
        !compareOtp(dto.otp, user.verificationCode)) {
      await this.recordFailedAttempt(user.id);
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationCode: null, verificationCodeExpiresAt: null },
    });
    await this.redis.del(this.otpAttemptKey(user.id));
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

    await this.checkAttemptLimit(user.id);
    if (!user.verificationCode || !user.verificationCodeExpiresAt ||
        user.verificationCodeExpiresAt.getTime() < Date.now()) {
      await this.redis.del(this.otpAttemptKey(user.id));
      throw new UnauthorizedException('Code expired — request a new one');
    }
    if (!compareOtp(dto.code, user.verificationCode)) {
      await this.recordFailedAttempt(user.id);
      throw new UnauthorizedException('Incorrect code');
    }

    await this.redis.del(this.otpAttemptKey(user.id));
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: null, verificationCodeExpiresAt: null },
    });
    return this.issueSessionTokens(user);
  }

  async oauthLogin(providerInput: string, dto: OAuthLoginDto) {
    const provider = providerInput.toLowerCase();
    if (provider !== 'google' && provider !== 'facebook') {
      throw new BadRequestException('OAuth provider must be google or facebook');
    }

    let profile: { id: string; email: string; name: string; emailVerified: boolean };
    let verifiedFacebookUserId: string | undefined;
    try {
      if (provider === 'google') {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not configured');
        const tokenInfoUrl = new URL('https://oauth2.googleapis.com/tokeninfo');
        tokenInfoUrl.searchParams.set('access_token', dto.accessToken);
        const tokenInfoResponse = await fetch(tokenInfoUrl, { signal: AbortSignal.timeout(8_000) });
        const tokenInfo = await tokenInfoResponse.json() as Record<string, unknown>;
        if (!tokenInfoResponse.ok || tokenInfo.aud !== clientId || tokenInfo.email_verified !== 'true' && tokenInfo.email_verified !== true) {
          throw new Error('Google access token audience or email verification is invalid');
        }
      } else {
        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        if (!appId || !appSecret) throw new Error('Facebook OAuth credentials are not configured');
        const debugUrl = new URL('https://graph.facebook.com/debug_token');
        debugUrl.searchParams.set('input_token', dto.accessToken);
        debugUrl.searchParams.set('access_token', `${appId}|${appSecret}`);
        const debugResponse = await fetch(debugUrl, { signal: AbortSignal.timeout(8_000) });
        const debugPayload = await debugResponse.json() as { data?: { is_valid?: boolean; app_id?: string; user_id?: string } };
        if (!debugResponse.ok || !debugPayload.data?.is_valid || debugPayload.data.app_id !== appId || !debugPayload.data.user_id) {
          throw new Error('Facebook access token is invalid for this application');
        }
        verifiedFacebookUserId = debugPayload.data.user_id;
      }

      const endpoint = provider === 'google'
        ? 'https://openidconnect.googleapis.com/v1/userinfo'
        : 'https://graph.facebook.com/me?fields=id,name,email';
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${dto.accessToken}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error('Provider rejected access token');
      const data = await response.json() as Record<string, unknown>;
      const id = typeof data.sub === 'string' ? data.sub : typeof data.id === 'string' ? data.id : '';
      const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      const emailVerified = provider === 'google' && data.email_verified === true;
      if (!id || !email || !name || (provider === 'google' && !emailVerified) || (provider === 'facebook' && id !== verifiedFacebookUserId)) {
        throw new Error('Provider profile is incomplete, unverified, or does not match the validated token');
      }
      profile = { id, email, name, emailVerified };
    } catch {
      throw new UnauthorizedException('OAuth access token is invalid or provider profile is unavailable');
    }

    const linked = await this.prisma.oAuthAccount.findFirst({
      where: { provider, providerAccountId: profile.id },
      include: { user: true },
    });
    if (linked) {
      if (!linked.user.emailVerified) {
        throw new ForbiddenException('Verify the email address associated with this OAuth account before signing in');
      }
      return this.issueSessionTokens(linked.user);
    }

    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (user && !user.emailVerified) {
      throw new ConflictException('Verify this email with the existing account before linking OAuth');
    }
    // Facebook's Graph profile does not provide a trustworthy email-verification
    // claim. Never attach it to an existing account or mark its email verified.
    if (user && !profile.emailVerified) {
      throw new ConflictException('Facebook cannot be safely auto-linked to an existing account. Sign in using your existing method');
    }
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          password: await hashPassword(randomBytes(48).toString('base64url')),
          role: UserRole.USER,
          emailVerified: profile.emailVerified,
        },
      });
    }

    try {
      await this.prisma.oAuthAccount.create({
        data: { userId: user.id, provider, providerAccountId: profile.id },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      const concurrentLink = await this.prisma.oAuthAccount.findFirst({
        where: { provider, providerAccountId: profile.id }, include: { user: true },
      });
      if (!concurrentLink) throw new ConflictException('This OAuth account is already linked to another user');
      user = concurrentLink.user;
    }

    if (!user.emailVerified) {
      await this.issueAndSendOtp(user.id, user.email, 'verify-email');
      return {
        success: true,
        requiresEmailVerification: true,
        message: 'Check your email for a verification code before signing in.',
      };
    }
    return this.issueSessionTokens(user);
  }

  async forgetPassword(emailInput: string, turnstileToken?: string) {
    const isTurnstileValid = await verifyTurnstileToken(turnstileToken ?? '');
    if (!isTurnstileValid) throw new BadRequestException('Turnstile verification failed');
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      await this.redis.del(this.otpAttemptKey(user.id));
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
    if (!user) throw new BadRequestException('Invalid or expired reset code');
    await this.checkAttemptLimit(user.id);
    if (!user.resetToken || !user.resetTokenExpiresAt ||
        user.resetTokenExpiresAt.getTime() < Date.now() ||
        !compareOtp(dto.otp, user.resetToken)) {
      await this.recordFailedAttempt(user.id);
      throw new BadRequestException('Invalid or expired reset code');
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { password: passwordHash, resetToken: null, resetTokenExpiresAt: null,
          verificationCode: null, verificationCodeExpiresAt: null },
      });
      await tx.refreshSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    await this.redis.del(this.otpAttemptKey(user.id));
    return { success: true, message: 'Password reset successfully.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await comparePassword(dto.currentPassword, user.password))) {
      throw new BadRequestException('Current password is incorrect');
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: passwordHash, resetToken: null, resetTokenExpiresAt: null },
      });
      await tx.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
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
    const tokenHash = this.hashToken(dto.refreshToken);
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash } });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token has been revoked or expired');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.emailVerified) throw new UnauthorizedException('Session expired or invalid');
    const tokens = this.createTokenPair(user);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshSession.updateMany({
        where: { id: session.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });
      if (revoked.count !== 1) throw new UnauthorizedException('Refresh token was already used');
      await tx.refreshSession.create({
        data: { userId: user.id, tokenHash: this.hashToken(tokens.refreshToken), expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000) },
      });
    });
    return { ...tokens, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshSession.updateMany({
        where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true, message: 'Refresh session revoked. Clear the accessToken and refreshToken cookies.' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, emailVerified: true },
    });
    if (!user) throw new UnauthorizedException('Session expired or invalid');
    return user;
  }

  async updateMyProfile(userId: string, name: string) {
    const normalizedName = name.trim();
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      throw new BadRequestException('Name must contain between 2 and 80 characters');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: normalizedName },
      select: { id: true, name: true, email: true, role: true, emailVerified: true },
    });
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
    const passwordHash = dto.password !== undefined ? await hashPassword(dto.password) : undefined;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.email !== undefined && { email: dto.email.trim().toLowerCase(), emailVerified: false }),
          ...(dto.role !== undefined && { role: dto.role }),
          ...(passwordHash !== undefined && { password: passwordHash }),
        },
        select: safeUserSelect,
      });
      if (dto.email !== undefined || dto.role !== undefined || dto.password !== undefined) {
        await tx.refreshSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return updated;
    });
  }

  async updateUserRole(id: string, role: UserRole) {
    await this.findOneUser(id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: { role }, select: safeUserSelect });
      await tx.refreshSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return updated;
    });
  }

  async removeUser(id: string) {
    await this.findOneUser(id);
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  private async issueAndSendOtp(userId: string, email: string, purpose: 'verify-email' | 'login') {
    await this.redis.del(this.otpAttemptKey(userId));
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

  private otpAttemptKey(userId: string) {
    return `auth:otp-attempts:${userId}`;
  }

  private async checkAttemptLimit(userId: string) {
    const count = Number(await this.redis.get(this.otpAttemptKey(userId)) ?? 0);
    if (count >= OTP_MAX_ATTEMPTS) {
      throw new ForbiddenException('Too many incorrect attempts. Request a new code.');
    }
  }

  private async recordFailedAttempt(userId: string) {
    const attempts = await this.redis.incrementWithExpiry(this.otpAttemptKey(userId), OTP_TTL_SECONDS);
    if (attempts > OTP_MAX_ATTEMPTS) {
      throw new ForbiddenException('Too many incorrect attempts. Request a new code.');
    }
  }

  private createTokenPair(user: {
    id: string; email: string; name: string; role: AuthTokenPayload['role'];
  }) {
    const base = { sub: user.id, email: user.email, name: user.name, role: user.role };
    return {
      accessToken: this.signToken(base, 'access', ACCESS_TOKEN_TTL_SECONDS),
      refreshToken: this.signToken(base, 'refresh', REFRESH_TOKEN_TTL_SECONDS),
    };
  }

  private async issueSessionTokens(user: {
    id: string; email: string; name: string; role: AuthTokenPayload['role'];
  }) {
    const tokens = this.createTokenPair(user);
    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    });
    return { ...tokens, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
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
