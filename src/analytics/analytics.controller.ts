import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('metrics')
  getMetrics(): Promise<AnalyticsResponseDto> {
    return this.analyticsService.getMetrics();
  }
}
