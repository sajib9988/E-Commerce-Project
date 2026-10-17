import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { RefreshDto } from './dto/refresh.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(201)
  @Post('auth/register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('auth/verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('auth/resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('auth/resend-otp')
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('auth/verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('auth/forget-password')
  forgetPassword(@Body() body: ForgetPasswordDto) {
    return this.authService.forgetPassword(body.email);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('auth/reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('auth/refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('auth/logout')
  logout() {
    return this.authService.logout();
  }

  @Post('auth/change-password')
  changePassword(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(currentUser.sub, dto);
  }

  @Get('auth/me')
  me(@CurrentUser() currentUser: AuthTokenPayload) {
    return this.authService.me(currentUser.sub);
  }

  // User administration now belongs to AuthModule too; SUPER_ADMIN only.
  @Roles('SUPER_ADMIN')
  @Get('users')
  findAllUsers(@Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.authService.findAllUsers({ search, page: Number(page) || 1, limit: Number(limit) || 10 });
  }

  @Roles('SUPER_ADMIN')
  @Get('users/:id')
  findOneUser(@Param('id') id: string) {
    return this.authService.findOneUser(id);
  }

  @Roles('SUPER_ADMIN')
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @Roles('SUPER_ADMIN')
  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.authService.updateUser(id, dto);
  }

  @Roles('SUPER_ADMIN')
  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body() body: UpdateUserRoleDto) {
    return this.authService.updateUserRole(id, body.role);
  }

  @Roles('SUPER_ADMIN')
  @Delete('users/:id')
  removeUser(@Param('id') id: string) {
    return this.authService.removeUser(id);
  }
}
