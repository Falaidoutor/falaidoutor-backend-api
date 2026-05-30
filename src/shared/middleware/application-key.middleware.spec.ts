import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ApplicationKeyMiddleware } from './application-key.middleware';

describe('ApplicationKeyMiddleware', () => {
  it('should allow CORS preflight requests without application key', () => {
    const middleware = new ApplicationKeyMiddleware({
      get: jest.fn().mockReturnValue('expected-key'),
    } as unknown as ConfigService);
    const next = jest.fn();

    middleware.use(
      { method: 'OPTIONS', headers: {}, url: '/api/login' } as Request,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
  });
});
