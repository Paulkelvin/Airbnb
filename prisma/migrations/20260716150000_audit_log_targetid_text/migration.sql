-- AuditLog.targetId is a polymorphic field referencing different entity types.
-- PlatformSetting uses string keys (not UUIDs) as its primary key, so
-- targetId must accept plain text, not just UUID values.
ALTER TABLE "AuditLog" ALTER COLUMN "targetId" TYPE TEXT;
