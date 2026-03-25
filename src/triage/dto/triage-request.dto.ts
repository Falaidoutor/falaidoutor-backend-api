import { IsNotEmpty, IsString } from 'class-validator';

export class TriageRequestDto {
  @IsString()
  @IsNotEmpty()
  queueId: string;

  @IsString()
  @IsNotEmpty()
  queueTicket: string;

  @IsString()
  @IsNotEmpty()
  symptoms: string;
}
