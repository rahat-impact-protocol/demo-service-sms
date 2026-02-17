import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainPaymentService } from './blockchain-payment.service';

describe('BlockchainPaymentService', () => {
  let service: BlockchainPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockchainPaymentService],
    }).compile();

    service = module.get<BlockchainPaymentService>(BlockchainPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
