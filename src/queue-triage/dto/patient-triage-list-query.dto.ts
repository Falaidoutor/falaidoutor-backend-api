import { IsNotEmpty, IsString } from 'class-validator';

export class PatientTriageListQueryDto {
  @IsString()
  @IsNotEmpty()
  cpf: string;
}
