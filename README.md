# Falaidoutor Backend API

Este repositório é o backend da plataforma **Falaidoutor**, um sistema de apoio à triagem clínica. A solução recebe dados de pacientes e sintomas, organiza a fila, solicita/processa resultados de triagem assistida por IA e oferece esses resultados para revisão e finalização por um profissional.

## Papel deste componente

Esta API é a camada de serviços e integração do sistema. Ela fornece autenticação, cadastro de pacientes, fila e triagens, revisão profissional, analytics e configuração do modelo; também aplica validações, segurança de requisições e acesso ao banco de dados. O frontend web consome seus endpoints, enquanto o serviço de modelo executa a análise de IA.

## Tecnologias e documentação

- NestJS, TypeScript, TypeORM e PostgreSQL.
- Swagger/OpenAPI é disponibilizado pela própria aplicação para consultar endpoints e DTOs.
- O diagrama das entidades está em [`docs/database-diagram.md`](docs/database-diagram.md).

## Desenvolvimento

Consulte os scripts do `package.json` para iniciar, testar, verificar estilo e gerar a build. A configuração do banco usa `synchronize: false`; migrations/scripts devem ser aplicados antes de executar em um ambiente novo.
