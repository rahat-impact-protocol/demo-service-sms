import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { encryptForService } from './utils/crypto.util';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    private readonly prisma: PrismaService
  ) {}

  @Get('/health')
  checkHealthStatus():string{
    return 'OK'
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

   @Post('/encryption')
  async getEncryption(@Body() data: any) {
    try {
      const registry = await this.prisma.registry.findUnique({
        where: { id: 'main' },
      });

      const publicKey = registry?.publicKey || '';
      console.log(publicKey)

      const res = await encryptForService(publicKey, data);
      console.log({res});
      return res;
    } catch (err) {
      console.log(err);
    }
  }
}
