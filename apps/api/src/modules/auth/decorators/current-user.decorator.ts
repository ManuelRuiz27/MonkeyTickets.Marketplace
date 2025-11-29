import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract the current authenticated user from the request
 * Usage: @CurrentUser() user: User
 * 
 * The user object is attached to the request by the JwtAuthGuard after validating the JWT token
 */
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
