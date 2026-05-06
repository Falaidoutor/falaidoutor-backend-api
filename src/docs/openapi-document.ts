export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'FalaiDoutor Backend API',
    version: '1.0.0',
    description: 'Documentacao dos endpoints implementados atualmente na API.',
  },
  servers: [
    {
      url: '/api',
      description: 'Prefixo global da API',
    },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Patients' },
    { name: 'Triages' },
    { name: 'Triage Chat' },
  ],
  components: {
    securitySchemes: {
      applicationKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-application-key',
        description: 'Chave da aplicacao configurada em APPLICATION_KEY.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['statusCode', 'message', 'timestamp', 'path'],
        properties: {
          statusCode: { type: 'integer', example: 400 },
          message: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
            example: 'Ficha invalida.',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2026-05-06T12:00:00.000Z',
          },
          path: { type: 'string', example: '/api/triage/chat' },
        },
      },
      HealthResponse: {
        type: 'object',
        required: ['status', 'timestamp'],
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2026-05-06T12:00:00.000Z',
          },
        },
      },
      AuthResponse: {
        type: 'object',
        required: ['authenticated', 'patientName', 'queueTriageId', 'statusId'],
        properties: {
          authenticated: { type: 'boolean', example: true },
          patientName: {
            type: 'string',
            nullable: true,
            example: 'Maria Silva',
          },
          queueTriageId: { type: 'integer', nullable: true, example: 42 },
          statusId: { type: 'integer', nullable: true, example: 0 },
        },
      },
      Patient: {
        type: 'object',
        required: ['id', 'name', 'cpf', 'age', 'gender'],
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Maria Silva' },
          cpf: { type: 'string', example: '12345678901' },
          age: { type: 'integer', minimum: 0, example: 34 },
          gender: { type: 'string', enum: ['M', 'F'], example: 'F' },
        },
      },
      CreatePatientRequest: {
        type: 'object',
        required: ['name', 'cpf', 'age', 'gender'],
        properties: {
          name: { type: 'string', example: 'Maria Silva' },
          cpf: {
            type: 'string',
            minLength: 11,
            maxLength: 14,
            example: '12345678901',
          },
          age: { type: 'integer', minimum: 0, example: 34 },
          gender: { type: 'string', enum: ['M', 'F', 'm', 'f'], example: 'F' },
        },
      },
      UpdatePatientRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Maria Silva' },
          cpf: {
            type: 'string',
            minLength: 11,
            maxLength: 14,
            example: '12345678901',
          },
          age: { type: 'integer', minimum: 0, example: 34 },
          gender: { type: 'string', enum: ['M', 'F', 'm', 'f'], example: 'F' },
        },
      },
      TriageRequest: {
        type: 'object',
        required: ['queueId', 'queueTicket', 'symptoms'],
        properties: {
          queueId: { type: 'string', example: '42' },
          queueTicket: { type: 'string', example: 'A001' },
          symptoms: {
            type: 'string',
            example: 'Dor no peito intensa e falta de ar.',
          },
        },
      },
      TriageMockRequest: {
        type: 'object',
        required: ['symptoms'],
        properties: {
          symptoms: {
            type: 'string',
            example: 'Febre, tosse e dor de garganta ha dois dias.',
          },
        },
      },
      TriageResponse: {
        type: 'object',
        required: [
          'symptoms',
          'classificacao',
          'nivel',
          'nome_nivel',
          'ponto_decisao_ativado',
          'criterios_ponto_decisao',
          'recursos_estimados',
          'justificativa',
        ],
        properties: {
          symptoms: { type: 'string', example: 'Dor no peito intensa.' },
          classificacao: {
            type: 'string',
            enum: ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'],
            example: 'ESI-2',
          },
          nivel: { type: 'integer', example: 2 },
          nome_nivel: { type: 'string', example: 'Emergente' },
          ponto_decisao_ativado: {
            type: 'string',
            example: 'Alto risco ou dor intensa',
          },
          criterios_ponto_decisao: {
            type: 'array',
            items: { type: 'string' },
            example: ['Dor toracica', 'Dispneia'],
          },
          recursos_estimados: { type: 'integer', example: 2 },
          justificativa: {
            type: 'string',
            example: 'Paciente apresenta sinais de alto risco.',
          },
        },
      },
      TriageListItem: {
        type: 'object',
        required: [
          'queueId',
          'name',
          'gender',
          'age',
          'queueTicket',
          'classificacao',
          'prioridade',
        ],
        properties: {
          queueId: { type: 'integer', example: 42 },
          name: { type: 'string', example: 'Maria Silva' },
          gender: { type: 'string', example: 'F' },
          age: { type: 'integer', example: 34 },
          queueTicket: { type: 'string', example: 'A001' },
          classificacao: { type: 'string', example: 'ESI-2' },
          prioridade: { type: 'string', example: '2' },
        },
      },
      FinalizedTriage: {
        type: 'object',
        required: [
          'queueId',
          'name',
          'gender',
          'age',
          'queueTicket',
          'symptoms',
          'classificacao',
          'nivel',
          'nome_nivel',
          'ponto_decisao_ativado',
          'criterios_ponto_decisao',
          'recursos_estimados',
          'justificativa',
          'createdAtDate',
          'createdAtTime',
        ],
        properties: {
          queueId: { type: 'integer', example: 42 },
          name: { type: 'string', example: 'Maria Silva' },
          gender: { type: 'string', example: 'F' },
          age: { type: 'integer', example: 34 },
          queueTicket: { type: 'string', example: 'A001' },
          symptoms: { type: 'string', example: 'Dor no peito intensa.' },
          classificacao: { type: 'string', example: 'ESI-2' },
          nivel: { type: 'integer', example: 2 },
          nome_nivel: { type: 'string', example: 'Emergente' },
          ponto_decisao_ativado: { type: 'string', example: '' },
          criterios_ponto_decisao: {
            type: 'array',
            items: { type: 'string' },
            example: [],
          },
          recursos_estimados: { type: 'integer', example: 0 },
          justificativa: {
            type: 'string',
            example: 'Paciente apresenta sinais de alto risco.',
          },
          createdAtDate: { type: 'string', example: '06/05/2026' },
          createdAtTime: { type: 'string', example: '14:30:00' },
        },
      },
      UpdateFinalizedTriageRequest: {
        type: 'object',
        properties: {
          symptoms: { type: 'string', example: 'Dor no peito intensa.' },
          classificacao: {
            type: 'string',
            enum: ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'],
            example: 'ESI-2',
          },
          justificativa: {
            type: 'string',
            example: 'Paciente apresenta sinais de alto risco.',
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Application key ausente, invalida ou nao configurada.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      BadRequest: {
        description: 'Requisicao invalida ou regra de negocio violada.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Recurso nao encontrado.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Verifica a saude da API no ambiente serverless.',
        responses: {
          '200': {
            description: 'API disponivel.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/login': {
      get: {
        tags: ['Auth'],
        summary: 'Autentica um paciente por CPF e ficha de fila.',
        security: [{ applicationKey: [] }],
        parameters: [
          {
            name: 'cpf',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            example: '12345678901',
          },
          {
            name: 'queueTicket',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            example: 'A001',
          },
        ],
        responses: {
          '200': {
            description: 'Resultado da autenticacao.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/patients': {
      get: {
        tags: ['Patients'],
        summary: 'Lista todos os pacientes.',
        security: [{ applicationKey: [] }],
        responses: {
          '200': {
            description: 'Pacientes ordenados por nome.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Patient' },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Patients'],
        summary: 'Cria um paciente.',
        security: [{ applicationKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePatientRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Paciente criado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Patient' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/patients/{id}': {
      get: {
        tags: ['Patients'],
        summary: 'Busca um paciente por ID.',
        security: [{ applicationKey: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 1,
          },
        ],
        responses: {
          '200': {
            description: 'Paciente encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Patient' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Patients'],
        summary: 'Atualiza um paciente por ID.',
        security: [{ applicationKey: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdatePatientRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Paciente atualizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Patient' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Patients'],
        summary: 'Remove um paciente por ID.',
        security: [{ applicationKey: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 1,
          },
        ],
        responses: {
          '204': { description: 'Paciente removido.' },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/triages': {
      get: {
        tags: ['Triages'],
        summary: 'Lista triagens finalizadas.',
        security: [{ applicationKey: [] }],
        responses: {
          '200': {
            description: 'Triagens finalizadas por prioridade.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/TriageListItem' },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/triages/{queueId}': {
      get: {
        tags: ['Triages'],
        summary: 'Busca os detalhes de uma triagem finalizada.',
        security: [{ applicationKey: [] }],
        parameters: [
          {
            name: 'queueId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 42,
          },
        ],
        responses: {
          '200': {
            description: 'Detalhes da triagem.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FinalizedTriage' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Triages'],
        summary: 'Atualiza uma triagem existente.',
        security: [{ applicationKey: [] }],
        parameters: [
          {
            name: 'queueId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 42,
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateFinalizedTriageRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Triagem atualizada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FinalizedTriage' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Triages'],
        summary: 'Inativa uma triagem existente.',
        description:
          "Atualiza o campo status da triagem para 'I', mantendo o registro no banco de dados.",
        security: [{ applicationKey: [] }],
        parameters: [
          {
            name: 'queueId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 42,
          },
        ],
        responses: {
          '204': { description: 'Triagem inativada.' },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/triage/chat': {
      post: {
        tags: ['Triage Chat'],
        summary: 'Processa uma triagem vinculada a uma ficha de fila.',
        security: [{ applicationKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TriageRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Triagem processada e vinculada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TriageResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/triage/mock': {
      post: {
        tags: ['Triage Chat'],
        summary: 'Processa uma triagem sem vincular a ficha de fila.',
        security: [{ applicationKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TriageMockRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Triagem processada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TriageResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
};
