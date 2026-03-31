import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DecryptedData, SendSmsDto, SendSmsPayload } from './dto/sms.dto';
import { InjectQueue } from '@nestjs/bull';
import { PROCESSOR, PROCESSOR_JOB } from 'src/common/constant/processor';
import { Queue } from 'bullmq';
import { ACTIONS } from '@rahat/sms-service-actions';

type ProviderConfig = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: Prisma.JsonObject;
};

type SendSmsResponse = {
  status: 'sent';
  messageId: string;
  timestamp: string;
};

@Injectable()
export class SmsService {
  constructor(
    @InjectQueue(PROCESSOR.SMS_RESPONSE) private readonly responseQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async addServiceProvider(data: any) {
    try {
      const res = await this.prisma.smsProvider.create({ data });
      return res;
    } catch (err) {
      throw err;
    }
  }

  async listServiceProvider() {
    return this.prisma.smsProvider.findMany({
      select: {
        uuid: true,
        name: true,
        pricePerApi: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async sendSMS(body: DecryptedData): Promise<SendSmsResponse | any> {
    return this.processSmsRequest(body, ACTIONS.SENDSMS.name);
  }

  async sendBulkSMS(body: DecryptedData): Promise<SendSmsResponse | any> {
    return this.processSmsRequest(body, ACTIONS.BULKSMS.name);
  }

  private async processSmsRequest(
    body: DecryptedData,
    actionPerformed: 'sendsms' | 'bulksms',
  ): Promise<SendSmsResponse | any> {
    let status;
    let responsePayload: any = {};
    const { callbackUrl, data, senderId, serviceId } = body;
    const receiver = data.receiver ?? data.to;
    try {
      if (!receiver) {
        throw new BadRequestException('receiver or to is required');
      }

      if (!data.message) {
        throw new BadRequestException('message is required');
      }

      const provider = data.smsprovider
        ? await this.prisma.smsProvider.findFirst({
            where: { name: data.smsprovider },
          })
        : await this.prisma.smsProvider.findFirst({
            orderBy: { createdAt: 'asc' },
          });

      if (!provider) {
        throw new NotFoundException('SMS provider not found');
      }

      const providerConfig = this.parseProviderConfig(provider.value);

      if (!providerConfig.url) {
        throw new InternalServerErrorException(
          'SMS provider URL is missing from provider config',
        );
      }

      const templateContext = this.buildTemplateContext({
        ...data,
        receiver,
        to: receiver,
      });

      const resolvedBody = providerConfig.body
        ? this.resolveTemplateValue(providerConfig.body, templateContext)
        : undefined;

      const response = await fetch(providerConfig.url, {
        method: providerConfig.method ?? 'POST',
        headers: {
          'content-type': 'application/json',
          ...(providerConfig.headers ?? {}),
        },
        body: resolvedBody ? JSON.stringify(resolvedBody) : undefined,
      });

      if (!response.ok) {
        const responseText = await response.text();
        status = 'error';
        responsePayload = {
          error: responseText,
          status: response.status,
          data: receiver,
        };
        await this.responseQueue.add(PROCESSOR_JOB.SMS_RESPONSE, {
          status,
          responsePayload,
          callbackUrl,
          responseSender: serviceId,
          responseReceiver: senderId,
          projectId: body?.projectId,
          actionPerformed,
        });
        return;
      }

      status = 'success';
      responsePayload = {
        status: response.status,
        data: receiver,
      };
      await this.responseQueue.add(PROCESSOR_JOB.SMS_RESPONSE, {
        status,
        responsePayload,
        callbackUrl,
        responseSender: serviceId,
        responseReceiver: senderId,
        projectId: body?.projectId,
        actionPerformed,
      });

      return {
        status: 'sent',
        messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      status = 'error';
      responsePayload = {
        error: err instanceof Error ? err.message : err,
        data: receiver,
      };
      await this.responseQueue.add(PROCESSOR_JOB.SMS_RESPONSE, {
        status,
        responsePayload,
        callbackUrl,
        responseSender: serviceId,
        responseReceiver: senderId,
        projectId: body?.projectId,
        actionPerformed,
      });
      console.log(err);
    }
  }

  private parseProviderConfig(value: Prisma.JsonValue): ProviderConfig {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new InternalServerErrorException(
        'SMS provider config must be an object',
      );
    }

    const config = value as Prisma.JsonObject;
    const url = config.url;
    const method = config.method;
    const headers = config.headers;
    const body = config.body;

    if (typeof url !== 'string') {
      throw new InternalServerErrorException(
        'SMS provider config url must be a string',
      );
    }

    if (method !== undefined && typeof method !== 'string') {
      throw new InternalServerErrorException(
        'SMS provider config method must be a string',
      );
    }

    if (
      headers !== undefined &&
      (!headers || typeof headers !== 'object' || Array.isArray(headers))
    ) {
      throw new InternalServerErrorException(
        'SMS provider config headers must be an object',
      );
    }

    if (
      body !== undefined &&
      (!body || typeof body !== 'object' || Array.isArray(body))
    ) {
      throw new InternalServerErrorException(
        'SMS provider config body must be an object',
      );
    }

    return {
      url,
      method,
      headers: headers as Record<string, string> | undefined,
      body: body as Prisma.JsonObject | undefined,
    };
  }

  private buildTemplateContext(
    data: Required<Pick<SendSmsPayload, 'receiver' | 'to'>> & SendSmsPayload,
  ) {
    const normalizedMessage =
      typeof data.message === 'string'
        ? { content: data.message }
        : (data.message ?? {});

    return {
      ...data,
      address: data.receiver,
      receiver: data.receiver,
      to: data.to,
      message: normalizedMessage,
    };
  }

  private resolveTemplateValue(
    value: Prisma.JsonValue,
    context: Record<string, unknown>,
  ): Prisma.JsonValue {
    if (typeof value === 'string') {
      return value.replace(/\{%(.*?)%\}/g, (_match, path: string) => {
        const resolved = this.getValueByPath(context, path.trim());
        return resolved === undefined || resolved === null
          ? ''
          : String(resolved);
      });
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.resolveTemplateValue(entry, context));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          this.resolveTemplateValue(entry as Prisma.JsonValue, context),
        ]),
      ) as Prisma.JsonObject;
    }

    return value;
  }

  private getValueByPath(
    source: Record<string, unknown>,
    path: string,
  ): unknown {
    const res = path.split('.').reduce<unknown>((currentValue, segment) => {
      if (!currentValue || typeof currentValue !== 'object') {
        return undefined;
      }

      return (currentValue as Record<string, unknown>)[segment];
    }, source);
    return res;
  }

  // async getRecipientList(page: number = 1, skip: number = 10): Promise<any> {
  //   // Get registry info from database
  //   const registry = await this.prisma.registry.findUnique({
  //     where: { id: 'main' },
  //   });

  //   if (!registry) {
  //     throw new Error('Registry not found');
  //   }

  //   if (!registry.publicKey) {
  //     throw new Error('Registry public key not found');
  //   }

  //   // Prepare payload to encrypt
  //   const payloadData = {
  //     page,
  //     skip,
  //   };

  //   // Encrypt the payload
  //   const encryptedPayload = encryptForService(
  //     registry.publicKey,
  //     payloadData,
  //   );

  //   console.log('Encrypted payload', encryptedPayload);

  //   // Return encrypted payload
  //   return encryptedPayload;
  // }
}
