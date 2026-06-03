export class FinalizedTriageDto {
  queueId: number;
  triageId?: number;
  source?: 'queue-triage' | 'patient-triage';
  name: string;
  gender: string;
  age: number;
  queueTicket: string;
  symptoms: string;
  classificacao: string;
  nivel: number;
  nome_nivel: string;
  ponto_decisao_ativado: string;
  criterios_ponto_decisao: string[];
  recursos_estimados: number;
  justificativa: string;
  createdAtDate: string;
  createdAtTime: string;
  aiRecommendedAction?: string | null;
}
