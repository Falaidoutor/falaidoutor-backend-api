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
  createPrivateKey,
  constants,
  privateDecrypt,
  randomBytes,
  KeyObject,
} from 'crypto';

export type SymmetricEncryptedPayload = {
  encrypted: true;
  alg: 'AES-256-GCM';
  iv: string;
  data: string;
};

export type PublicKeyEncryptedPayload = {
  encrypted: true;
  alg: 'RSA-OAEP-256+A256GCM';
  key: string;
  iv: string;
  data: string;
};

export type SessionEncryptedPayload = {
  encrypted: true;
  alg: 'A256GCM';
  iv: string;
  data: string;
};

export type EncryptedPayload =
  | SymmetricEncryptedPayload
  | PublicKeyEncryptedPayload
  | SessionEncryptedPayload;

export type DecryptedHttpPayload<T> = {
  value: T;
  responseKey?: Buffer;
};

@Injectable()
export class HttpCryptoService {
  private readonly authTagLength = 16;
  private readonly ivLength = 12;
  private privateKey?: KeyObject;

  constructor(private readonly configService: ConfigService) {}

  isEncryptedPayload(value: unknown): value is EncryptedPayload {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const payload = value as Partial<EncryptedPayload>;

    return (
      payload.encrypted === true &&
      ['AES-256-GCM', 'RSA-OAEP-256+A256GCM', 'A256GCM'].includes(
        payload.alg ?? '',
      ) &&
      typeof payload.iv === 'string' &&
      typeof payload.data === 'string'
    );
  }

  encrypt(value: unknown): SymmetricEncryptedPayload {
    return this.encryptWithAesKey(value, this.getSharedKey(), 'AES-256-GCM');
  }

  encryptWithSessionKey(
    value: unknown,
    responseKey: Buffer,
  ): SessionEncryptedPayload {
    return this.encryptWithAesKey(value, responseKey, 'A256GCM');
  }

  decryptIncoming<T = unknown>(
    payload: EncryptedPayload,
  ): DecryptedHttpPayload<T> {
    if (payload.alg === 'RSA-OAEP-256+A256GCM') {
      const responseKey = this.decryptSessionKey(payload.key);

      return {
        value: this.decryptWithAesKey<T>(payload, responseKey),
        responseKey,
      };
    }

    if (payload.alg === 'AES-256-GCM') {
      return {
        value: this.decryptWithAesKey<T>(payload, this.getSharedKey()),
      };
    }

    throw new BadRequestException('Invalid encrypted payload.');
  }

  decrypt<T = unknown>(payload: EncryptedPayload): T {
    return this.decryptIncoming<T>(payload).value;
  }

  private encryptWithAesKey<
    TAlg extends
      | SymmetricEncryptedPayload['alg']
      | SessionEncryptedPayload['alg'],
  >(
    value: unknown,
    key: Buffer,
    alg: TAlg,
  ): TAlg extends 'AES-256-GCM'
    ? SymmetricEncryptedPayload
    : SessionEncryptedPayload {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(value ?? null), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encrypted: true,
      alg,
      iv: iv.toString('base64'),
      data: Buffer.concat([encrypted, authTag]).toString('base64'),
    } as TAlg extends 'AES-256-GCM'
      ? SymmetricEncryptedPayload
      : SessionEncryptedPayload;
  }

  private decryptWithAesKey<T = unknown>(
    payload:
      | SymmetricEncryptedPayload
      | PublicKeyEncryptedPayload
      | SessionEncryptedPayload,
    key: Buffer,
  ): T {
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
      const decipher = createDecipheriv('aes-256-gcm', key, iv);

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

  private decryptSessionKey(encryptedKey: string): Buffer {
    try {
      return privateDecrypt(
        {
          key: this.getPrivateKey(),
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(encryptedKey, 'base64'),
      );
    } catch {
      throw new BadRequestException('Invalid encrypted payload.');
    }
  }

  private getSharedKey(): Buffer {
    const secret = this.configService.get<string>('HTTP_CRYPTO_SECRET')?.trim();

    if (!secret) {
      throw new UnauthorizedException('HTTP crypto secret is not configured.');
    }

    return createHash('sha256').update(secret, 'utf8').digest();
  }

  private getPrivateKey(): KeyObject {
    if (this.privateKey) {
      return this.privateKey;
    }

    const privateKey = this.configService
      .get<string>('HTTP_CRYPTO_PRIVATE_KEY')
      ?.trim();

    if (!privateKey) {
      throw new UnauthorizedException(
        'HTTP crypto private key is not configured.',
      );
    }

    this.privateKey = privateKey.includes('-----BEGIN')
      ? createPrivateKey(privateKey.replace(/\\n/g, '\n'))
      : createPrivateKey({
          key: Buffer.from(privateKey, 'base64'),
          format: 'der',
          type: 'pkcs8',
        });

    return this.privateKey;
  }
}
