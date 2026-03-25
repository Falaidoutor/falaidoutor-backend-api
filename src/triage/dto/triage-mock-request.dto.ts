import { IsNotEmpty, IsString } from 'class-validator';

export class TriageMockRequestDto {
  @IsString()
  @IsNotEmpty()
  symptoms: string;
}
