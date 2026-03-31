import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DecryptPayloadInterceptor } from '../interceptors/decrypt-payload.interceptor';
import { DecryptPaymentInterceptor } from '../interceptors/decrypt-payment.interceptor';
import { PaymentIntentInterceptor } from '../interceptors/payment-intent.interceptor';
import { QueueModule } from 'src/queue/queue.module';
import { BullModule } from '@nestjs/bull';
import { PROCESSOR } from 'src/common/constant/processor';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({name:PROCESSOR.SMS_RESPONSE})],
  controllers: [SmsController],
  providers: [
    SmsService,
    DecryptPayloadInterceptor,
    DecryptPaymentInterceptor,
    PaymentIntentInterceptor,
  ],
})
export class SmsModule {}
