export class PendingReviewTriageDto {
  id: number;
  patientId: number;
  patientName: string;
  patientAge: number;
  patientGender: string;
  symptoms: string;
  aiSummary: string | null;
  aiSuggestedRiskClassification: string | null;
  aiSuggestedRiskColor: string | null;
  aiRecommendedAction: string | null;
  aiResult: Record<string, any> | null;
  createdAt: string;
  aiProcessedAt: string | null;
  queueTriageId: number | null;
  queueTicket: string | null;
}
