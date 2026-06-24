import { dispatchEvent } from '../../../shared/events/registry.js';
import { storageOutboxRepository } from '../repository/outbox.repository.js';
import { STORAGE_EVENT_TYPES, type StorageUploadRequestedPayload } from './types.js';

export const storageEvents = {
  async publishUploadRequested(payload: StorageUploadRequestedPayload) {
    const event = await storageOutboxRepository.publish({
      aggregateType: 'storage_object',
      aggregateId: payload.storageObjectId,
      eventType: STORAGE_EVENT_TYPES.uploadRequested,
      tenantId: payload.tenantId,
      payload: payload as unknown as Record<string, unknown>,
    });
    await dispatchEvent(STORAGE_EVENT_TYPES.uploadRequested, payload);
    return event;
  },
};

export { STORAGE_EVENT_TYPES } from './types.js';
export { registerMalwareScanHook } from './malware-scan.hook.js';
