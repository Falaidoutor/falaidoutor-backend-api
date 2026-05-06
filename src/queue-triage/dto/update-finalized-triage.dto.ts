import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateFinalizedTriageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  symptoms?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'])
  classificacao?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  justificativa?: string;
}
