export class TriageListDto {
  queueId: number;
  triageId?: number;
  source?: 'queue-triage' | 'patient-triage';
  name: string;
  gender: string;
  age: number;
  queueTicket: string;
  classificacao: string;
  prioridade: string;
  status?: string;
}
