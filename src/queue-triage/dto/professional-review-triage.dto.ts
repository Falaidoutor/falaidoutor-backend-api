import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class ProfessionalReviewTriageDto {
  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsOptional()
  @IsString()
  professionalNotes?: string;

  @IsOptional()
  @IsObject()
  finalResult?: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  @IsIn(['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'])
  finalRiskClassification: string;

  @IsOptional()
  @IsString()
  finalRiskColor?: string;
}
