import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { HttpCryptoService } from '../crypto/http-crypto.service';
import { HttpCryptoMiddleware } from './http-crypto.middleware';

describe('HttpCryptoMiddleware', () => {
  it('should allow CORS preflight requests without encrypted payload', () => {
    const middleware = new HttpCryptoMiddleware(
      {
        get: jest.fn().mockReturnValue('true'),
      } as unknown as ConfigService,
      {
        isEncryptedPayload: jest.fn().mockReturnValue(false),
      } as unknown as HttpCryptoService,
    );
    const next = jest.fn();

    middleware.use(
      {
        method: 'OPTIONS',
        headers: {},
        query: {},
        body: {},
        url: '/api/login',
      } as Request,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
  });
});
