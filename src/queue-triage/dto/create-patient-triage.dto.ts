import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePatientTriageDto {
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @IsString()
  @IsNotEmpty()
  symptoms: string;
}
