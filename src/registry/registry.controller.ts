import { Controller, Get } from '@nestjs/common';
import { RegistryService } from './registry.service';

@Controller('registry')
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}

  @Get('health')
  checkHealth(): boolean {
    return true;
  }
}
