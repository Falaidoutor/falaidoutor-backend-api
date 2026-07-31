export type AnalyticsRiskLevel = 'ESI-1' | 'ESI-2' | 'ESI-3' | 'ESI-4' | 'ESI-5';

export class AnalyticsResponseDto {
  generatedAt: string;
  patientsToday: number;
  patientsTodayDelta: number | null;
  averageWaitMinutes: number | null;
  averageWaitDelta: number | null;
  aiAccuracy: number | null;
  aiAccuracyDelta: number | null;
  criticalCases: number;
  criticalCasesDelta: number | null;
  riskDistribution: Array<{ level: AnalyticsRiskLevel; count: number }>;
  hourlyVolume: number[];
  forecastDemand: number[];
  staffingCapacity: number[];
  agreement: {
    total: number | null;
    oneLevel: number | null;
    broad: number | null;
  };
}
