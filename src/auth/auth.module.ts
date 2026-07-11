import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from 'src/email/email.service';
import { QueueModule } from 'src/email/queue/queue.module';
import { JwtStrategy } from './jwt.strategy';
import { EmailModule } from 'src/email/email.module';
import { TemplateModule } from 'src/email/template/template.module';
@Module({
  imports: [
    QueueModule, // Importa QueueModule para usar la cola de email
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // ⚠️ Usa una variable de entorno real en producción
        signOptions: { expiresIn: '1h', algorithm: 'HS256' }, // Asegúrate de que el algoritmo coincida con tu configuración de JWT
      }),
    }),
    EmailModule, // Importa EmailModule para usar EmailService
    TemplateModule, // Importa TemplateModule si necesitas servicios de plantillas
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtStrategy],
})
export class AuthModule {}
