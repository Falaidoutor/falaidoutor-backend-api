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

async function bootstrapServer(): Promise<HttpServer> {
  if (!cachedServer) {
    const [{ NestFactory }, { AppModule }, { configureApp }] =
      await Promise.all([
        import('@nestjs/core'),
        import('../src/app.module.js'),
        import('../src/app.config.js'),
      ]);

    const app = await NestFactory.create(AppModule);
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
  if (req.url?.startsWith('/favicon.ico')) {
    res.statusCode = 204;
    return res.end();
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
