import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bullmq';
import axios from 'axios';
import { PROCESSOR, PROCESSOR_JOB } from 'src/common/constant/processor';

@Processor(PROCESSOR.SMS_RESPONSE)
export class ResponseProcessor {
  @Process(PROCESSOR_JOB.SMS_RESPONSE)
  async handleResponse(job: Job) {
    const { callbackUrl, ...body } = job.data;
    if (!callbackUrl) {
      console.error('No callbackUrl provided in job data');
      return;
    }
    try {
      const response = await axios.post(callbackUrl, body, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Callback sent successfully:', response.status);
    } catch (error) {
      console.error(
        'Error sending callback:',
        error?.response?.data || error.message,
      );
    }
  }
}
