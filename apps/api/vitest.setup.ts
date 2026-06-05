/**
 * Minimal env for modules that call getEnv() at import time.
 * Service tests mock db/redis; these values satisfy schema validation only.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://loomis:loomis@localhost:15432/loomis';
process.env.DATABASE_AUDIT_URL = 'postgresql://loomis:loomis@localhost:15432/loomis_audit';
process.env.REDIS_URL = 'redis://localhost:16379';
process.env.JWT_PRIVATE_KEY =
  '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDOG81gQy0aad57\nyhtZzCp0OD3vaZAV+A7lRTKDJHHO4w0pZiFZDCS8CsL0yaCIJrWgbwm++PnMBSq1\nwr2q/A2b8XGNHoHayx5vKDCPNHqyUWONZfIHmQn/8G3at0kE0L6UGIDiHdFhGInv\nkohj1gM7joFWZklGJ0NzBrHHGv6iDyKclGYorScd8AUJAaWF86d78q0THx0mZofq\nyU3cimNgtqdPxAV7LFPFurrvroQZNqBi8B5bScFWH3osn6Sl6QPVj9+lSQrE3uUm\nV0lFzSbgUkR71EC/wBrCkVOiZb8v6noy4w6lTbW6zN9pclsvBV5W56N27asBl3By\nZhs/eEQfAgMBAAECggEALbdT/BSaZf/yleGT5HyZNBMfhcGT8JOHdko9dII6binF\nixe4sOA1K7J1YMdyQJDZe371mfLusVa6DPvnhwwGVr8csTEBm46vLveqobEBwBi2\nbLAemZnT8n2ZWEiMPTGx+/ZdbAoyHYfMXKPTddWL/QNUY94nRZTC7Log56lwrnAo\nB5OrFyMJGTsbQ61OCNUKyTwowUvPCPM7Rm2YseKgS5p02VLW6gloCm7LasIq0r5s\nuxMERXA1QVNRPmMABZzUhMuO5YiJIYl5LfroBx9tide2Z6VXUvFIevxMT02Ul16c\nRdCnA0FlMW6bly2AVTXAU6qmM4JzkP8k0fc65ewovQKBgQDtfbyWCb0kGguHcZcK\ntJ2VBGplxRD8hPEfAx+8OHKEt0i3jJrSqPoxaXca7v+YV1scqaos1+A+nq2ou2El\nLXKCUvVR6KAxeVsKt0+76qMxtSHZFd9CihSKp11wTGd+taLcgLEW0dauMgitU+m0\nZKWa+zY9Y2Wc0h1jZzSx/+qYrQKBgQDeK/Em61gofIOvEqxpqdex1NOk8Un42iAp\nGRkoaGDGhaqLjT31H6kITtj8NkxKO3A4j4f6XRLe5CF+bhinYjAT7Kwm/mJpTm2E\n1kfFHIyg3qFhQcVtOTDBTCNoa1SkyjY5CKgs0ZUMSs5f0sB6SwLP/JGEQivMt9Mz\nRCDDMWStewKBgDWaU55pxE8JseB4OucnrQmdXYZq3FKijum5Asiw1OgvljIXgjpZ\n+V59t2xU1UvFK8NkaAyHDQ4VMo0K/fouL9JKdyRtpPqFsY7RoSWA6CSoBWPCFAoo\nsEo7TFO0awemZ4PtaAsGgbX/hQXaEr2smdRJLwzcCmtC4W82NCaY5JJhAoGBANPX\nnnf3y/W+1GlpKtENy8ebIbuS/2+zvRqy/dQTwsNIzNeH8935NFnhpPDIbXISvuyP\nn57QhJ/Xc0B0hjmEXEeDUptT0E6NI8yX7ZM7p7P01HhCGJgPAjgt+00jmnAPCCjV\n4lXp+W7hHWstL67sO2BKeg5cchsf5NhrS7oTLOZlAoGBAN7e45Eld7hrKnwfqWrs\n8F4+0tY6IKXRXimWqn2zDzJxwJkewydUBMaSnaGmMNzLrN4frJ3Pf6781xFSP4EQ\nglU/8KDT/mvaGRUV2PUTKUlBm18JWdCemunWFowxB4VHHmJo6HAhbwGMheX5idfk\n2FeESC+t37AXr1kllUX5Myfv\n-----END PRIVATE KEY-----';
process.env.JWT_PUBLIC_KEY =
  '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzhvNYEMtGmnee8obWcwq\ndDg972mQFfgO5UUygyRxzuMNKWYhWQwkvArC9MmgiCa1oG8Jvvj5zAUqtcK9qvwN\nm/FxjR6B2ssebygwjzR6slFjjWXyB5kJ//Bt2rdJBNC+lBiA4h3RYRiJ75KIY9YD\nO46BVmZJRidDcwaxxxr+og8inJRmKK0nHfAFCQGlhfOne/KtEx8dJmaH6slN3Ipj\nYLanT8QFeyxTxbq6766EGTagYvAeW0nBVh96LJ+kpekD1Y/fpUkKxN7lJldJRc0m\n4FJEe9RAv8AawpFTomW/L+p6MuMOpU21uszfaXJbLwVeVuejdu2rAZdwcmYbP3hE\nHwIDAQAB\n-----END PUBLIC KEY-----';
process.env.REFRESH_TOKEN_HMAC_SECRET = 'GNJ6h1OvTpOp+bBJXXjsBDfWzJoM26sHRRGNx216u/A=';
process.env.TOTP_ENCRYPTION_KEY = 'UOYfOoj5UsHbKzH68Pvaw1Z0GFhMK6W8AJuWTbh7HDU=';
process.env.S3_BUCKET = 'loomis-test';
process.env.S3_REGION = 'af-south-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
