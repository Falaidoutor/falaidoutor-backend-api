import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('metrics')
  getMetrics(
    @Query('qualityPeriod') qualityPeriod?: string,
  ): Promise<AnalyticsResponseDto> {
    return this.analyticsService.getMetrics(qualityPeriod);
  }
}
