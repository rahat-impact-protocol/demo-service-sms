import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RegistryModule } from './registry/registry.module';
import { SmsModule } from './sms/sms.module';
import { PaymentModule } from './payment/payment.module';
import { PrismaService } from './prisma/prisma.service';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [RegistryModule, SmsModule, PaymentModule, QueueModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
