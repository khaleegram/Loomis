import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GetDownloadUrlResponse, SetPhotoRequest, StaffProfileResponse } from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { queryKeys } from '../keys.js';

const PHOTO_URL_STALE_MS = 4 * 60 * 1000; // 4 min — just under the 5 min presigned URL expiry

export function photoUrlQueryOptions(
  client: ApiClient,
  storageObjectId: string | null | undefined,
) {
  return {
    queryKey: queryKeys.storage.downloadUrl(storageObjectId ?? ''),
    queryFn: () =>
      client.get<GetDownloadUrlResponse>(`/storage/objects/${storageObjectId}/url`),
    staleTime: PHOTO_URL_STALE_MS,
    enabled: Boolean(storageObjectId),
  };
}

export function usePhotoUrl(storageObjectId: string | null | undefined) {
  const client = useApiClient();
  return useQuery(photoUrlQueryOptions(client, storageObjectId));
}

/** Alias for document downloads (certificates, exports). */
export const useStorageDownloadUrl = usePhotoUrl;

export function useSetStaffPhoto(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      staffProfileId,
      storageObjectId,
    }: {
      staffProfileId: string;
      storageObjectId: string;
    }) =>
      client.patch<StaffProfileResponse>(
        `/tenants/${tenantId}/staff/${staffProfileId}/photo`,
        { storageObjectId } satisfies SetPhotoRequest,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.hrm.staffList(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.hrm.staffDetail(tenantId, variables.staffProfileId),
      });
    },
  });
}
