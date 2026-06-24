-- Web Push (PWA) support for parent absence notifications (US-PAR-002).

ALTER TABLE comms.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_platform_valid;
ALTER TABLE comms.push_subscriptions ADD CONSTRAINT push_subscriptions_platform_valid
  CHECK (platform IN ('android', 'ios', 'web'));

ALTER TABLE comms.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_provider_valid;
ALTER TABLE comms.push_subscriptions ADD CONSTRAINT push_subscriptions_provider_valid
  CHECK (provider IN ('fcm', 'apns', 'webpush'));
