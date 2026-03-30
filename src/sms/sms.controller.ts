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

interface SendSmsDto {
  to: string;
  from?: string;
  message: string;
  smsprovider?: string;
}

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
  async sendSms(@Body() dto: SendSmsDto): Promise<SendSmsResponse> {
    return this.smsService.sendSMS(dto);
  }

  @Post('bulk')
  async sendBulkSms(@Body() dto: SendSmsDto[]): Promise<SendSmsResponse[]> {
    const results: SendSmsResponse[] = [];

    for (let i = 0; i < dto.length; i++) {
      console.log('Sending SMS to');
      // Process each request
      const result: SendSmsResponse = {
        status: 'sent',
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
      results.push(result);

      // Wait 2 seconds before processing next request (except for the last one)
      if (i < dto.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return results;
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
