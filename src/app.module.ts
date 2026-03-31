import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RegistryModule } from './registry/registry.module';
import { SmsModule } from './sms/sms.module';
import { PaymentModule } from './payment/payment.module';
import { PrismaService } from './prisma/prisma.service';
import { QueueModule } from './queue/queue.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6678'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    QueueModule,
    RegistryModule,
    SmsModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
