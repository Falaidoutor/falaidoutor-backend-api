import { Controller, Get, Header } from '@nestjs/common';
import { openApiDocument } from './openapi-document';
import { getSwaggerUiHtml } from './swagger-ui-html';

@Controller()
export class DocsController {
  @Get('docs-json')
  getOpenApiDocument() {
    return openApiDocument;
  }

  @Get('docs')
  @Header('content-type', 'text/html; charset=utf-8')
  getSwaggerUi(): string {
    return getSwaggerUiHtml();
  }
}
