import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateModelConfigDto {
  @IsString()
  modelName: string;

  @IsString()
  provider: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  systemPrompt: string;

  @IsNumber()
  @Min(0.1)
  @Max(1)
  temperature: number;

  @IsNumber()
  @Min(0.1)
  @Max(1)
  topP: number;

  @IsBoolean()
  @IsOptional()
  ragEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  streamingEnabled?: boolean;

  @IsString()
  @IsOptional()
  versionLabel?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
