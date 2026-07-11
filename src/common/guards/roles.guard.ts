import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtenemos los roles requeridos desde los metadatos del decorador @Roles()
  const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    //So no se define ningun rol en el endpoint, dejamos pasar la petición
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    // Obtenemos el usuario de la request (lo añade AuthGuard cuando el usuario esta logado
    const { user } = context.switchToHttp().getRequest();
    // si el usuario no esta autenticado, solo dejamos pasar si 'public' es uno de los roles permitidos
    if (!user) {
      return requiredRoles.includes('public');
    }
    console.log('--RolesGuard--');
    console.log('User:', user);
    console.log('Required Roles:', requiredRoles);
    console.log('User Roles:', user.role);
    console.log('--------');
    //si tiene roles como array (como el de modelo user en prisma)
    const userRoles: string[] = Array.isArray(user.role)
      ? user.role
      : typeof user.role === 'string'
        ? [user.role]
        : [];
    return userRoles.some((role: string) => requiredRoles.includes(role));
  }
}
