import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type SendSmsPayload = {
  to?: string;
  receiver?: string;
  from?: string;
  message?: string | { content?: string; [key: string]: unknown };
  smsprovider?: string;
};

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
  constructor(private readonly prisma: PrismaService) {}

  async sendSMS(data: SendSmsPayload): Promise<SendSmsResponse> {
    const receiver = data.receiver ?? data.to;

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
      throw new InternalServerErrorException(
        `SMS provider request failed with status ${response.status}: ${responseText}`,
      );
    }

    return {
      status: 'sent',
      messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      timestamp: new Date().toISOString(),
    };
  }

  private parseProviderConfig(value: Prisma.JsonValue): ProviderConfig {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new InternalServerErrorException('SMS provider config must be an object');
    }

    const config = value as Prisma.JsonObject;
    const url = config.url;
    const method = config.method;
    const headers = config.headers;
    const body = config.body;

    if (typeof url !== 'string') {
      throw new InternalServerErrorException('SMS provider config url must be a string');
    }

    if (method !== undefined && typeof method !== 'string') {
      throw new InternalServerErrorException('SMS provider config method must be a string');
    }

    if (
      headers !== undefined &&
      (!headers || typeof headers !== 'object' || Array.isArray(headers))
    ) {
      throw new InternalServerErrorException('SMS provider config headers must be an object');
    }

    if (
      body !== undefined &&
      (!body || typeof body !== 'object' || Array.isArray(body))
    ) {
      throw new InternalServerErrorException('SMS provider config body must be an object');
    }

    return {
      url,
      method,
      headers: headers as Record<string, string> | undefined,
      body: body as Prisma.JsonObject | undefined,
    };
  }

  private buildTemplateContext(data: Required<Pick<SendSmsPayload, 'receiver' | 'to'>> & SendSmsPayload) {
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
      console.log({value})
      return value.replace(/\{%(.*?)%\}/g, (_match, path: string) => {
        const resolved = this.getValueByPath(context, path.trim());
        console.log({resolved})
        return resolved === undefined || resolved === null ? '' : String(resolved);
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

  private getValueByPath(source: Record<string, unknown>, path: string): unknown {
    const res=  path.split('.').reduce<unknown>((currentValue, segment) => {
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
