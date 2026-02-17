import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RegistryModule } from './registry/registry.module';
import { SmsModule } from './sms/sms.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [RegistryModule, SmsModule, PaymentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
