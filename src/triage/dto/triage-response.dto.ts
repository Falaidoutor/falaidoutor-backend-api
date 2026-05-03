export class TriageResponseDto {
  symptoms: string;
  classificacao: string;
  nivel: number;
  nome_nivel: string;
  ponto_decisao_ativado: string;
  criterios_ponto_decisao: string[];
  recursos_estimados: number;
  justificativa: string;
}
