import { PatientTriageStatus } from '../../shared/entities/patient-triage.entity';

export class PatientTriageResponseDto {
  id: number;
  symptoms: string;
  queueTicket: string;
  symptomsPreview: string;
  createdAt: string;
  updatedAt: string;
  status: PatientTriageStatus;
  patientStatus: 'PENDENTE' | 'ANALISADA';
  riskClassification: string | null;
  displayColor: string;
}
