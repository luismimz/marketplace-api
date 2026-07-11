import { Module } from '@nestjs/common';
import { TemplateService } from './template.service';
import { TemplateController } from './template.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [TemplateController],
  providers: [TemplateService, PrismaService], // PrismaService es opcional, solo si lo necesitas con conexión a la base de datos
  exports: [TemplateService], // Exporta el servicio para que pueda ser utilizado en otros
})
export class TemplateModule {}
