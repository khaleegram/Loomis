import { z } from 'zod';

/**
 * Cursor-based pagination only — no offset/limit (System Design §4.3).
 * The cursor is an opaque base64-encoded UUIDv7.
 */
export const paginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;

export function cursorPage<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    nextCursor: z.string().nullable(),
  });
}

export type CursorPage<T> = {
  data: T[];
  nextCursor: string | null;
};
