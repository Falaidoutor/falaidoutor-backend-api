import { IsIn, IsInt, IsNotEmpty, IsString, Length, Min } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(11, 14)
  cpf: string;

  @IsInt()
  @Min(0)
  age: number;

  @IsString()
  @IsIn(['M', 'F', 'm', 'f'])
  gender: string;
}
