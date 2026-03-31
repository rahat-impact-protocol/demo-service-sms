import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { SmsService } from './sms.service';
import { DecryptPayload } from '../decorators/decrypt-payload.decorator';
import { RequirePaymentIntent } from '../decorators/require-payment-intent.decorator';
import { DecryptPayment } from 'src/decorators/decrypt-payment.decorator';
import { DecryptedData, SendSmsDto } from './dto/sms.dto';

// interface SendSmsDto {

//   to: string;
//   from?: string;
//   message: string;
//   smsprovider?: string;
// }

interface SendSmsResponse {
  status: 'sent' | 'queued' | 'failed';
  messageId: string;
  timestamp: string;
}

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  @DecryptPayload()
  // @DecryptPayment()
  async sendSms(@Body() dto: DecryptedData): Promise<SendSmsResponse> {
    return this.smsService.sendSMS(dto as any);
  }

  @Post('bulk')
  @DecryptPayload()
  async sendBulkSms(@Body() dto: DecryptedData): Promise<SendSmsResponse> {
    return this.smsService.sendBulkSMS(dto as any);
  }

  // @Get('recipients')
  // @RequirePaymentIntent({
  //   tokenAddress: '0x2Eb3B2214Bd05DA00494c54776b95e73180FbFda',
  //   amount: '1',
  //   gatewayAddress: process.env.GATEWAY_ADDRESS || '0xYourGatewayAddress',
  // })
  // async getRecipients(@Query() query: any): Promise<any> {
  //   const page = query.page ? Number(query.page) : 1;
  //   const skip = query.skip ? Number(query.skip) : 10;

  //   return this.smsService.getRecipientList(page, skip);
  // }

  @Post('encrypted')
  @DecryptPayload()
  async handleEncryptedRequest(@Body() dto: any): Promise<any> {
    // dto.target contains the target information
    // dto.payload now contains the decrypted payload (was encrypted hex string)
    console.log('Target:', dto.target);
    console.log('Decrypted payload:', dto.payload);

    return {
      success: true,
      message: 'Payload decrypted successfully',
      target: dto.target,
      payload: dto.payload,
    };
  }
}
