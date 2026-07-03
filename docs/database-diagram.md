# Diagrama do Banco de Dados

Baseado nas entidades TypeORM em `src/shared/entities` e no script `sql/patient-triages.sql`.

```mermaid
erDiagram
  PATIENT {
    int id PK
    string name
    string cpf UK
    int age
    char gender
  }

  STATUS_QUEUE {
    int id PK
    string status_name
  }

  TRIAGE {
    int id PK
    text symptoms
    string risk
    text justification
    string status
  }

  QUEUE_TRIAGE {
    int id PK
    string queue_ticket
    int patient_id FK
    int triage_id FK "nullable"
    int status_id FK
    timestamp created_at
  }

  PATIENT_TRIAGES {
    int id PK
    int patient_id FK
    int queue_triage_id FK "nullable"
    varchar queue_ticket UK
    text symptoms
    enum status
    boolean ai_processed
    boolean ai_processing
    int ai_attempts
    timestamp last_ai_attempt_at "nullable"
    timestamp next_ai_retry_at "nullable"
    text ai_error "nullable"
    jsonb ai_result "nullable"
    text ai_summary "nullable"
    varchar ai_suggested_risk_classification "nullable"
    varchar ai_suggested_risk_color "nullable"
    text ai_recommended_action "nullable"
    timestamp ai_processed_at "nullable"
    boolean professional_reviewed
    int professional_id "nullable"
    text professional_notes "nullable"
    jsonb final_result "nullable"
    varchar final_risk_classification "nullable"
    varchar final_risk_color "nullable"
    timestamp professional_reviewed_at "nullable"
    timestamp created_at
    timestamp updated_at
  }

  PATIENT ||--o{ QUEUE_TRIAGE : "patient_id"
  PATIENT ||--o{ PATIENT_TRIAGES : "patient_id"
  STATUS_QUEUE ||--o{ QUEUE_TRIAGE : "status_id"
  TRIAGE ||--o| QUEUE_TRIAGE : "triage_id"
  QUEUE_TRIAGE ||--o{ PATIENT_TRIAGES : "queue_triage_id"
```

## Observações

- `patient.cpf` é único pela entidade TypeORM.
- `patient_triages.queue_ticket` é único pelo script SQL.
- `patient_triages.status` usa o enum `falaidoutor.patient_triage_status` com os valores `PENDING`, `AI_PROCESSING`, `WAITING_PROFESSIONAL_REVIEW` e `COMPLETED`.
- `patient_triages.updated_at` é atualizado por trigger no script `sql/patient-triages.sql`.
- A configuração TypeORM esta com `synchronize: false`, então a estrutura real depende das migrations/scripts aplicados no banco.
