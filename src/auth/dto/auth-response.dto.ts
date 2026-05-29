export class AuthResponseDto {
  authenticated: boolean;
  patientName: string | null;
  patientId: number | null;
  cpf: string | null;

  constructor(
    authenticated: boolean,
    patientName: string | null = null,
    patientId: number | null = null,
    cpf: string | null = null,
  ) {
    this.authenticated = authenticated;
    this.patientName = patientName;
    this.patientId = patientId;
    this.cpf = cpf;
  }
}
