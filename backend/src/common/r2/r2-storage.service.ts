import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class R2StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('r2.bucket') ?? '';
    this.publicUrl = config.get<string>('r2.publicUrl') ?? '';

    const customEndpoint = config.get<string>('r2.endpoint');
    const accountId = config.get<string>('r2.accountId');
    const endpoint =
      customEndpoint || `https://${accountId}.r2.cloudflarestorage.com`;

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: !!customEndpoint, // required for MinIO path-style URLs
      credentials: {
        accessKeyId: config.get<string>('r2.accessKeyId') ?? '',
        secretAccessKey: config.get<string>('r2.secretAccessKey') ?? '',
      },
    });
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return `${this.publicUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
