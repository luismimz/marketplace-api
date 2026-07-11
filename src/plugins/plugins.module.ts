// este archivo es el que define el módulo de plugins en tu aplicación NestJS
// Aquí se importan los servicios y controladores necesarios para el módulo de plugins
// Asegúrate de que los servicios y controladores estén correctamente implementados en sus respectivos
import { Module } from '@nestjs/common';
import { PluginsService } from './plugins.service';
import { PluginsController } from './plugins.controller';
import { PrismaService } from 'src/prisma/prisma.service'; //si tienes un servicio Prisma, puedes importarlo aquí,
// de lo contrario, puedes eliminar esta línea si no es necesario

@Module({
  providers: [PluginsService, PrismaService], //PrismaService es opcional, solo si lo necesitas con conexión a la base de datos
  exports: [PluginsService], // Exporta el servicio para que pueda ser utilizado en otros módulos
  controllers: [PluginsController],
})
export class PluginsModule {}
