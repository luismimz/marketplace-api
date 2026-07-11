import { SetMetadata } from '@nestjs/common';

//constante para definir el nombre del metadato de roles
export const ROLES_KEY = 'roles';
/**
 * Roles soportados en la app. Añade/ajusta según tu modelo.
 */
export type AppRole = 'admin' | 'moderator' | 'agency' | 'user' | 'public';
/**
 * Decorador para asociar roles requeridos al handler.
 * Uso: @Roles('admin','user')
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
