import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientTriage } from '../shared/entities/patient-triage.entity';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import {
  AnalyticsQualityPeriod,
  AnalyticsResponseDto,
  AnalyticsRiskLevel,
} from './dto/analytics-response.dto';

type AnalyticsRow = {
  source: string;
  ticket: string;
  created_at: Date | string;
  completed_at: Date | string | null;
  risk: string | null;
  ai_risk: string | null;
  final_risk: string | null;
};

const RISK_LEVELS: AnalyticsRiskLevel[] = [
  'ESI-1',
  'ESI-2',
  'ESI-3',
  'ESI-4',
  'ESI-5',
];

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PatientTriage)
    private readonly patientTriageRepository: Repository<PatientTriage>,
    @InjectRepository(QueueTriage)
    private readonly queueTriageRepository: Repository<QueueTriage>,
  ) {}

  async getMetrics(period?: string): Promise<AnalyticsResponseDto> {
    const rows = await this.patientTriageRepository.query<AnalyticsRow[]>(`
      SELECT 'patient-triage' AS source, pt.queue_ticket, pt.created_at,
        pt.professional_reviewed_at AS completed_at,
        COALESCE(pt.final_risk_classification, pt.ai_suggested_risk_classification) AS risk,
        pt.ai_suggested_risk_classification AS ai_risk,
        pt.final_risk_classification AS final_risk
      FROM falaidoutor.patient_triages pt
      WHERE pt.status IN ('PENDING', 'AI_PROCESSING', 'WAITING_PROFESSIONAL_REVIEW', 'COMPLETED')
      UNION ALL
      SELECT 'queue-triage' AS source, qt.queue_ticket, qt.created_at, NULL AS completed_at,
        t.risk, NULL AS ai_risk, t.risk AS final_risk
      FROM falaidoutor.queue_triage qt
      INNER JOIN falaidoutor.triage t ON t.id = qt.triage_id AND t.status = 'A'
      WHERE qt.status_id = 1
        AND NOT EXISTS (
          SELECT 1 FROM falaidoutor.patient_triages pt WHERE pt.queue_triage_id = qt.id
        )
    `);

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayRows = rows.filter((row) => this.date(row.created_at) >= today);
    const yesterdayRows = rows.filter((row) => {
      const date = this.date(row.created_at);
      return date >= yesterday && date < today;
    });
    const quality = this.getQualityWindow(period, today, yesterday, now);
    const qualityRows = rows.filter((row) => {
      const date = this.date(row.created_at);
      return date >= quality.start && date < quality.end;
    });
    const todayWaits = this.getWaits(todayRows, now);
    const yesterdayWaits = this.getWaits(yesterdayRows, today);
    const reviewed = qualityRows.filter((row) => row.ai_risk && row.final_risk);
    const agreement = reviewed.map((row) =>
      this.riskDistance(row.ai_risk, row.final_risk),
    );
    const hourlyVolume = Array.from(
      { length: 24 },
      (_, hour) =>
        todayRows.filter((row) => this.date(row.created_at).getHours() === hour)
          .length,
    );
    const recentAverage = Math.max(0, Math.round(todayRows.length / 24));
    const currentHourVolume = hourlyVolume[now.getHours()] || recentAverage;
    const todayCritical = this.countCritical(todayRows);
    const yesterdayCritical = this.countCritical(yesterdayRows);

    return {
      generatedAt: now.toISOString(),
      patientsToday: todayRows.length,
      patientsTodayDelta: this.delta(todayRows.length, yesterdayRows.length),
      averageWaitMinutes: this.average(todayWaits),
      averageWaitDelta: this.delta(
        this.average(todayWaits),
        this.average(yesterdayWaits),
      ),
      aiAccuracy: reviewed.length
        ? this.percent(
            agreement.filter((distance) => distance === 0).length,
            reviewed.length,
          )
        : null,
      aiAccuracyDelta: null,
      criticalCases: todayCritical,
      criticalCasesDelta: this.delta(todayCritical, yesterdayCritical),
      riskDistribution: RISK_LEVELS.map((level) => ({
        level,
        count: todayRows.filter((row) => row.risk === level).length,
      })),
      hourlyVolume,
      forecastDemand: Array.from({ length: 16 }, (_, index) =>
        Math.max(0, Math.round(currentHourVolume * (1 + index / 20))),
      ),
      staffingCapacity: Array.from({ length: 16 }, () =>
        Math.max(1, recentAverage * 2),
      ),
      agreement: {
        total: reviewed.length
          ? this.percent(
              agreement.filter((distance) => distance === 0).length,
              reviewed.length,
            )
          : null,
        oneLevel: reviewed.length
          ? this.percent(
              agreement.filter((distance) => distance === 1).length,
              reviewed.length,
            )
          : null,
        broad: reviewed.length
          ? this.percent(
              agreement.filter((distance) => distance >= 2).length,
              reviewed.length,
            )
          : null,
      },
      qualityPeriod: quality.period,
      qualityPeriodLabel: quality.label,
      qualityStart: quality.start.toISOString(),
      qualityEnd: quality.end.toISOString(),
    };
  }

  private getWaits(rows: AnalyticsRow[], pendingEnd: Date): number[] {
    return rows
      .filter((row) => row.source === 'patient-triage')
      .map((row) => {
        const end = row.completed_at ? this.date(row.completed_at) : pendingEnd;
        return (end.getTime() - this.date(row.created_at).getTime()) / 60000;
      })
      .filter((minutes) => minutes >= 0);
  }

  private getQualityWindow(
    period: string | undefined,
    today: Date,
    yesterday: Date,
    now: Date,
  ): { period: AnalyticsQualityPeriod; label: string; start: Date; end: Date } {
    const normalized: AnalyticsQualityPeriod =
      period === 'yesterday' || period === 'last7d' || period === 'last30d'
        ? period
        : 'today';

    if (normalized === 'yesterday') {
      return {
        period: normalized,
        label: 'Ontem (00h–24h)',
        start: yesterday,
        end: today,
      };
    }

    if (normalized === 'last7d') {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { period: normalized, label: 'Últimos 7 dias', start, end: now };
    }

    if (normalized === 'last30d') {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return {
        period: normalized,
        label: 'Últimos 30 dias',
        start,
        end: now,
      };
    }

    return {
      period: 'today',
      label: 'Hoje (00h–agora)',
      start: today,
      end: now,
    };
  }

  private countCritical(rows: AnalyticsRow[]): number {
    return rows.filter((row) => row.risk === 'ESI-1' || row.risk === 'ESI-2')
      .length;
  }

  private date(value: Date | string | null): Date {
    return value instanceof Date ? value : new Date(value ?? 0);
  }

  private average(values: number[]): number | null {
    return values.length
      ? Math.round(
          values.reduce((sum, value) => sum + value, 0) / values.length,
        )
      : null;
  }

  private percent(value: number, total: number): number {
    return Math.round((value / total) * 1000) / 10;
  }

  private delta(
    current: number | null,
    previous: number | null,
  ): number | null {
    return current !== null && previous
      ? Math.round(((current - previous) / previous) * 1000) / 10
      : null;
  }

  private riskDistance(first: string | null, second: string | null): number {
    const firstIndex = RISK_LEVELS.indexOf(first as AnalyticsRiskLevel);
    const secondIndex = RISK_LEVELS.indexOf(second as AnalyticsRiskLevel);
    return firstIndex < 0 || secondIndex < 0
      ? 99
      : Math.abs(firstIndex - secondIndex);
  }
}
