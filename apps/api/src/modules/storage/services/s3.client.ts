import { HeadObjectCommand, PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from '../../../config/env.js';

/** Pre-signed URL lifetime — SEC-DAT-008 / System Design §10 (5 minutes). */
export const PRESIGNED_URL_EXPIRY_SECONDS = 300;

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const env = getEnv();
    s3Client = new S3Client({
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export interface PresignedPutInput {
  bucket: string;
  objectKey: string;
  contentType: string;
  contentLengthBytes: number;
}

export interface PresignedGetInput {
  bucket: string;
  objectKey: string;
}

export interface PutObjectInput {
  bucket: string;
  objectKey: string;
  contentType: string;
  body: Buffer;
}

export const s3PresignService = {
  async createPutUrl(input: PresignedPutInput): Promise<string> {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.objectKey,
      ContentType: input.contentType,
      ContentLength: input.contentLengthBytes,
      ServerSideEncryption: 'AES256',
    });
    return getSignedUrl(client, command, { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS });
  },

  async putObject(input: PutObjectInput): Promise<void> {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.objectKey,
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.body.length,
        ServerSideEncryption: 'AES256',
      }),
    );
  },

  async createGetUrl(input: PresignedGetInput): Promise<string> {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: input.bucket,
      Key: input.objectKey,
    });
    return getSignedUrl(client, command, { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS });
  },

  async objectExists(input: PresignedGetInput): Promise<boolean> {
    const client = getS3Client();
    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: input.bucket,
          Key: input.objectKey,
        }),
      );
      return true;
    } catch {
      return false;
    }
  },
};
