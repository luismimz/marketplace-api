//esto facilita la obtención del usuario autenticado en los controladores
//por ejemplo, en un controlador, puedes usarlo así:
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestUserSafe {
  userId: number;
  email: string;
  role: string;
  [k: string]: unknown;
}

export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUserSafe | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUserSafe }>();
    return request.user;
  },
);
