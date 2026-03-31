import { Module } from '@nestjs/common';
import {BullModule} from '@nestjs/bull';
import { PROCESSOR } from 'src/common/constant/processor';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ResponseProcessor } from './response.processor';

@Module({
    imports:[
         
    BullModule.registerQueue(
      { name: PROCESSOR.SMS_RESPONSE },
    ),
    PrismaModule,
    ],
    providers: [ResponseProcessor],
})
export class QueueModule {}
