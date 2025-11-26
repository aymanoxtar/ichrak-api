import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): { status: string; message: string; timestamp: string } {
    return {
      status: 'ok',
      message: 'Ichrak API is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  healthCheck(): { status: string } {
    return { status: 'ok' };
  }
}
