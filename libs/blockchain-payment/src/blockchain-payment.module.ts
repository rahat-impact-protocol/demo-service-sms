import { Module } from '@nestjs/common';
import { BlockchainPaymentService } from './blockchain-payment.service';

@Module({
  providers: [BlockchainPaymentService],
  exports: [BlockchainPaymentService],
})
export class BlockchainPaymentModule {}
