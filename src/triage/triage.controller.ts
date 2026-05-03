import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { TriageMockRequestDto } from './dto/triage-mock-request.dto';
import { TriageRequestDto } from './dto/triage-request.dto';
import { TriageResponseDto } from './dto/triage-response.dto';
import { TriageService } from './triage.service';

@Controller('triage')
export class TriageController {
  constructor(private readonly triageService: TriageService) {}

  @Post('chat')
  @HttpCode(HttpStatus.CREATED)
  triageChat(@Body(ValidationPipe) dto: TriageRequestDto): Promise<TriageResponseDto> {
    return this.triageService.createTriage(dto);
  }

  @Post('mock')
  @HttpCode(HttpStatus.OK)
  triageChatMock(
    @Body(ValidationPipe) dto: TriageMockRequestDto,
  ): Promise<TriageResponseDto> {
    return this.triageService.createTriageMock(dto.symptoms);
  }
}
