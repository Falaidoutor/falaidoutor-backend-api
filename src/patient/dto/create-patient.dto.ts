import { IsIn, IsInt, IsNotEmpty, IsString, Matches, Min } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/)
  cpf: string;

  @IsInt()
  @Min(0)
  age: number;

  @IsString()
  @IsIn(['M', 'F', 'm', 'f'])
  gender: string;
}
