export const PROCESSOR = {
  SEND_SMS: 'sendsms',
  SMS_RESPONSE: 'smsresponse',
} as const;

export const PROCESSOR_JOB = {
  SEND_SMS: 'sendsms', 
  BULK_SEND_SMS:'bulksendsms',
  SMS_RESPONSE: 'smsresponse',
} as const;
