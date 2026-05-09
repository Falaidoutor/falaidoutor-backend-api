import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

export type EncryptedPayload = {
  encrypted: true;
  alg: 'AES-256-GCM';
  iv: string;
  data: string;
};

@Injectable()
export class HttpCryptoService {
  private readonly authTagLength = 16;
  private readonly ivLength = 12;

  constructor(private readonly configService: ConfigService) {}

  isEncryptedPayload(value: unknown): value is EncryptedPayload {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const payload = value as Partial<EncryptedPayload>;

    return (
      payload.encrypted === true &&
      payload.alg === 'AES-256-GCM' &&
      typeof payload.iv === 'string' &&
      typeof payload.data === 'string'
    );
  }

  encrypt(value: unknown): EncryptedPayload {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv('aes-256-gcm', this.getKey(), iv);
    const plaintext = Buffer.from(JSON.stringify(value ?? null), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encrypted: true,
      alg: 'AES-256-GCM',
      iv: iv.toString('base64'),
      data: Buffer.concat([encrypted, authTag]).toString('base64'),
    };
  }

  decrypt<T = unknown>(payload: EncryptedPayload): T {
    try {
      const iv = Buffer.from(payload.iv, 'base64');
      const encryptedWithTag = Buffer.from(payload.data, 'base64');

      if (
        iv.length !== this.ivLength ||
        encryptedWithTag.length <= this.authTagLength
      ) {
        throw new Error('Invalid encrypted payload.');
      }

      const authTag = encryptedWithTag.subarray(
        encryptedWithTag.length - this.authTagLength,
      );
      const encrypted = encryptedWithTag.subarray(
        0,
        encryptedWithTag.length - this.authTagLength,
      );
      const decipher = createDecipheriv('aes-256-gcm', this.getKey(), iv);

      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString('utf8');

      return JSON.parse(decrypted) as T;
    } catch {
      throw new BadRequestException('Invalid encrypted payload.');
    }
  }

  private getKey(): Buffer {
    const secret =
      this.configService.get<string>('HTTP_CRYPTO_SECRET')?.trim() ||
      this.configService.get<string>('APPLICATION_KEY')?.trim();

    if (!secret) {
      throw new UnauthorizedException('HTTP crypto secret is not configured.');
    }

    return createHash('sha256').update(secret, 'utf8').digest();
  }
}
