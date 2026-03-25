import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { FinalizedTriageDto } from './dto/finalized-triage.dto';
import { TriageListDto } from './dto/triage-list.dto';
import { QueueTriageService } from './queue-triage.service';

@Controller('triages')
export class QueueTriageController {
  constructor(private readonly queueTriageService: QueueTriageService) {}

  @Get()
  getFinalizedTriages(): Promise<TriageListDto[]> {
    return this.queueTriageService.getFinalizedTriages();
  }

  @Get(':queueId')
  getDetails(@Param('queueId', ParseIntPipe) queueId: number): Promise<FinalizedTriageDto> {
    return this.queueTriageService.getQueueTriageById(queueId);
  }
}
