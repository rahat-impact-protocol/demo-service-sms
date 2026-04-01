import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Job } from 'bullmq';
import { PROCESSOR, PROCESSOR_JOB } from 'src/common/constant/processor';
import { DecryptedData } from './dto/sms.dto';
import { SmsService } from './sms.service';

@Processor(PROCESSOR.SEND_SMS)
export class SmsProcessor {
  constructor(private readonly smsService: SmsService) {}

  @Process(PROCESSOR_JOB.SEND_SMS)
  async handleSendSms(job: Job<{ body: DecryptedData }>) {
    await this.smsService.executeSmsRequest(job.data.body, 'sendsms');
  }

  @Process(PROCESSOR_JOB.BULK_SEND_SMS)
  async handleBulkSendSms(job: Job<{ body: DecryptedData }>) {
    await this.smsService.executeSmsRequest(job.data.body, 'bulksms');
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(
      `[SMS Worker] Active job id=${job.id} name=${job.name} queue=${job?.queueName}`,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: unknown) {
    console.log(
      `[SMS Worker] Completed job id=${job.id} name=${job.name} result=${JSON.stringify(result ?? null)}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    console.error(
      `[SMS Worker] Failed job id=${job?.id} name=${job?.name} error=${error?.message}`,
    );
  }
}