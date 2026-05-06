import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
  ValidationPipe,
} from '@nestjs/common';
import { FinalizedTriageDto } from './dto/finalized-triage.dto';
import { TriageListDto } from './dto/triage-list.dto';
import { UpdateFinalizedTriageDto } from './dto/update-finalized-triage.dto';
import { QueueTriageService } from './queue-triage.service';

@Controller('triages')
export class QueueTriageController {
  constructor(private readonly queueTriageService: QueueTriageService) {}

  @Get()
  getFinalizedTriages(): Promise<TriageListDto[]> {
    return this.queueTriageService.getFinalizedTriages();
  }

  @Get(':queueId')
  getDetails(
    @Param('queueId', ParseIntPipe) queueId: number,
  ): Promise<FinalizedTriageDto> {
    return this.queueTriageService.getQueueTriageById(queueId);
  }

  @Put(':queueId')
  update(
    @Param('queueId', ParseIntPipe) queueId: number,
    @Body(ValidationPipe) dto: UpdateFinalizedTriageDto,
  ): Promise<FinalizedTriageDto> {
    return this.queueTriageService.updateQueueTriage(queueId, dto);
  }

  @Delete(':queueId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('queueId', ParseIntPipe) queueId: number): Promise<void> {
    return this.queueTriageService.removeQueueTriage(queueId);
  }
}
