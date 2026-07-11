import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './email/queue/queue.module';
import { EmailModule } from './email/email.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { configValidationSchema } from '../config/config.schema';
import { PlansModule } from './plan/plans.module'; // Asegúrate de importar el módulo de planes
import { QueuesHealthController } from './health/queues.health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
    }),
    PrismaModule,
    QueueModule, // Importa el módulo de la cola de correos y debe ir antes de EmailModule
    EmailModule,
    UserModule,
    AuthModule,
    PlansModule, // Importa el módulo de planes
  ],
  controllers: [AppController, QueuesHealthController],
  providers: [AppService],
})
export class AppModule {}
