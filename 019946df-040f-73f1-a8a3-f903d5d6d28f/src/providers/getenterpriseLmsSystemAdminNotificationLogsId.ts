import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsNotificationLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed information of a notification log by ID
 *
 * This operation retrieves detailed information about a specific notification
 * log entry by its ID within Enterprise LMS. Provides full notification details
 * including type, recipient, message body, delivery status, and timestamps.
 *
 * Access control is enforced for tenant data isolation, allowing only
 * authorized system administrators.
 *
 * @param props - Object containing authentication and identifier
 * @param props.systemAdmin - The authenticated system administrator payload
 * @param props.id - Unique identifier (UUID) of the target notification log
 * @returns Notification log data with full details
 * @throws {Error} Throws if the notification log with the specified ID does not
 *   exist
 */
export async function getenterpriseLmsSystemAdminNotificationLogsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsNotificationLog> {
  const notificationLog =
    await MyGlobal.prisma.enterprise_lms_notification_logs.findUniqueOrThrow({
      where: { id: props.id },
    });

  return {
    id: notificationLog.id,
    tenant_id: notificationLog.tenant_id,
    notification_type: notificationLog.notification_type,
    recipient_identifier: notificationLog.recipient_identifier,
    message_body: notificationLog.message_body,
    delivery_status: notificationLog.delivery_status,
    sent_at: notificationLog.sent_at
      ? toISOStringSafe(notificationLog.sent_at)
      : null,
    created_at: toISOStringSafe(notificationLog.created_at),
    updated_at: toISOStringSafe(notificationLog.updated_at),
  };
}
