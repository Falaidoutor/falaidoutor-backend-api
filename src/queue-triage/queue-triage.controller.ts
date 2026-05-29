import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { CreatePatientTriageDto } from './dto/create-patient-triage.dto';
import { FinalizedTriageDto } from './dto/finalized-triage.dto';
import { PatientTriageListQueryDto } from './dto/patient-triage-list-query.dto';
import { PatientTriageResponseDto } from './dto/patient-triage-response.dto';
import { PendingReviewTriageDto } from './dto/pending-review-triage.dto';
import { ProfessionalReviewTriageDto } from './dto/professional-review-triage.dto';
import { TriageListDto } from './dto/triage-list.dto';
import { UpdateFinalizedTriageDto } from './dto/update-finalized-triage.dto';
import { PatientTriageService } from './patient-triage.service';
import { QueueTriageService } from './queue-triage.service';

@Controller('triages')
export class QueueTriageController {
  constructor(
    private readonly queueTriageService: QueueTriageService,
    private readonly patientTriageService: PatientTriageService,
  ) {}

  @Get('me')
  getPatientTriages(
    @Query(ValidationPipe) query: PatientTriageListQueryDto,
  ): Promise<PatientTriageResponseDto[]> {
    return this.patientTriageService.listPatientTriages(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createPatientTriage(
    @Body(ValidationPipe) dto: CreatePatientTriageDto,
  ): Promise<PatientTriageResponseDto> {
    return this.patientTriageService.createPatientTriage(dto);
  }

  @Get('pending-review')
  getPendingReview(): Promise<PendingReviewTriageDto[]> {
    return this.patientTriageService.getPendingProfessionalReview();
  }

  @Patch(':triageId/professional-review')
  professionalReview(
    @Param('triageId', ParseIntPipe) triageId: number,
    @Body(ValidationPipe) dto: ProfessionalReviewTriageDto,
  ): Promise<PatientTriageResponseDto> {
    return this.patientTriageService.confirmProfessionalReview(triageId, dto);
  }

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
