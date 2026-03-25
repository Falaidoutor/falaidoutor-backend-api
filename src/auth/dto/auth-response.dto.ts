export class AuthResponseDto {
  authenticated: boolean;
  patientName: string | null;
  queueTriageId: number | null;
  statusId: number | null;

  constructor(
    authenticated: boolean,
    patientName: string | null = null,
    queueTriageId: number | null = null,
    statusId: number | null = null,
  ) {
    this.authenticated = authenticated;
    this.patientName = patientName;
    this.queueTriageId = queueTriageId;
    this.statusId = statusId;
  }
}
