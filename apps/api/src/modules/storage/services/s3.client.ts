import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
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

export const s3PresignService = {
  async createPutUrl(input: PresignedPutInput): Promise<string> {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.objectKey,
      ContentType: input.contentType,
      ContentLength: input.contentLengthBytes,
      // Private bucket + SSE; production uses per-classification KMS keys (§10.1).
      ServerSideEncryption: 'AES256',
    });
    return getSignedUrl(client, command, { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS });
  },

  async createGetUrl(input: PresignedGetInput): Promise<string> {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: input.bucket,
      Key: input.objectKey,
    });
    return getSignedUrl(client, command, { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS });
  },
};
