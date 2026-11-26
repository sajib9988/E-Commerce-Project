
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthTokenPayload } from '../types/auth-token-payload';

type AuthenticatedRequest = {
  user?: AuthTokenPayload;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthTokenPayload | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
