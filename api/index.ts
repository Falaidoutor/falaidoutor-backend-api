import 'reflect-metadata';

type ServerlessRequest = {
  method?: string;
  url?: string;
};
type ServerlessResponse = {
  statusCode?: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
};
type HttpServer = (req: ServerlessRequest, res: ServerlessResponse) => void;

let cachedServer: HttpServer | undefined;

function getPath(url = '/'): string {
  return url.split('?')[0] || '/';
}

function setCorsHeaders(res: ServerlessResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Accept, Content-Type, Authorization, x-application-key, x-payload-encrypted',
  );
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
}

function isDocsPath(path: string): boolean {
  return path === '/api/docs' || path === '/docs';
}

function isDocsJsonPath(path: string): boolean {
  return path === '/api/docs-json' || path === '/docs-json';
}

async function bootstrapServer(): Promise<HttpServer> {
  if (!cachedServer) {
    const [{ NestFactory }, { AppModule }, { configureApp }] =
      await Promise.all([
        import('@nestjs/core'),
        import('../src/app.module.js'),
        import('../src/app.config.js'),
      ]);

    const app = await NestFactory.create(AppModule, { abortOnError: false });
    configureApp(app);
    await app.init();
    cachedServer = app.getHttpAdapter().getInstance() as HttpServer;
  }

  return cachedServer;
}

export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse,
) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const path = getPath(req.url);

  if (req.url?.startsWith('/favicon.ico') || req.url?.startsWith('/favicon.png')) {
    res.statusCode = 204;
    return res.end();
  }

  if (isDocsPath(path)) {
    const { getSwaggerUiHtml } = await import('../src/docs/swagger-ui-html.js');

    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.end(getSwaggerUiHtml());
  }

  if (isDocsJsonPath(path)) {
    const { openApiDocument } = await import('../src/docs/openapi-document.js');

    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(openApiDocument));
  }

  if (path === '/' || path === '/api/health' || path === '/health') {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }));
  }

  try {
    const server = await bootstrapServer();
    return server(req, res);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected bootstrap error';
    const stack = error instanceof Error ? error.stack : undefined;

    console.error(
      `Failed to bootstrap function for ${req.method ?? 'UNKNOWN'} ${req.url ?? '/'}`,
      stack ?? message,
    );

    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      statusCode: 500,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    }));
  }
}
