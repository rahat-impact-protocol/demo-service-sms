import { Module } from '@nestjs/common';
import {BullModule} from '@nestjs/bull';
import { PROCESSOR } from 'src/common/constant/processor';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports:[
         BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT||'6678'),
        password:process.env.REDIS_PASSWORD
      },
    }),
    BullModule.registerQueue(
      { name: PROCESSOR.SMS_RESPONSE },
    ),
    PrismaModule,
    ]
})
export class QueueModule {}
