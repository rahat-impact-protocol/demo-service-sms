import {IsOptional, IsString} from 'class-validator';
import { ApiProperty } from "@nestjs/swagger";


export class SendSmsDto{
    @ApiProperty({example:'1.0.0', required:true})
    @IsString()
    version:string

    @ApiProperty({example:'12324',required:true})
    @IsString()
    serviceId: string

    @ApiProperty({example:'sendSms',required:true})
    @IsString()
    capability: string

    @ApiProperty({example:'123245',required:true})
    @IsString()
    senderId: string

    @ApiProperty({example:'0x41b',required:true})
    @IsString()
    message: string

    @ApiProperty({example:'http://localhost:3000/callbackUrl',required:true})
    @IsString()
    callbackUrl:string

    @ApiProperty({example:'08976-6789-0987-1234',required:true})
    @IsString()
    @IsOptional()
    projectId?:string
}

export type SendSmsPayload = {
  to?: string;
  receiver?: string;
  from?: string;
  message?: string | { content?: string; [key: string]: unknown };
  smsprovider?: string;
};

export class DecryptedData{
    @ApiProperty({example:'1.0.0', required:true})
    @IsString()
    version:string

    @ApiProperty({example:'12324',required:true})
    @IsString()
    serviceId: string

    @ApiProperty({example:'sendSms',required:true})
    @IsString()
    capability: string

    @ApiProperty({example:'123245',required:true})
    @IsString()
    senderId: string

    @ApiProperty({required:true})
    @IsString()
    data: SendSmsPayload

    @ApiProperty({example:'http://localhost:3000/callbackUrl',required:true})
    @IsString()
    callbackUrl:string

    @ApiProperty({example:'08976-6789-0987-1234',required:true})
    @IsString()
    @IsOptional()
    projectId?:string

}