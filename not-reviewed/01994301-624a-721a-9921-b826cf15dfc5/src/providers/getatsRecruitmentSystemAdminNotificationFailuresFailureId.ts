import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationFailure";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get details of a specific notification failure log
 * (ats_recruitment_notification_failures) by failureId.
 *
 * Fetch full details of a specific notification delivery failure log using its
 * failureId. Only authorized system administrators can view these records, as
 * they may contain sensitive context about user communications and system
 * operations.
 *
 * Read access is strictly monitored and all fetch activity is subject to
 * security/audit logging for compliance. Typical use cases include
 * post-incident analysis, recurring error examination, and addressing delivery
 * issues to improve reliability.
 *
 * Related endpoints include PATCH /notificationFailures for failure log search
 * and GET /notifications/{notificationId} for parent notification event
 * details. An error is returned if the failureId is not found.
 *
 * @param props - Contains the authenticated system admin and the unique
 *   failureId to retrieve
 * @param props.systemAdmin - The authenticated system administrator
 *   (authorization required)
 * @param props.failureId - Unique identifier of the notification failure log to
 *   retrieve
 * @returns Full details of the specified notification failure log
 * @throws {Error} If the failureId does not correspond to an existing log
 *   record
 */
export async function getatsRecruitmentSystemAdminNotificationFailuresFailureId(props: {
  systemAdmin: SystemadminPayload;
  failureId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentNotificationFailure> {
  const { failureId } = props;
  const failure =
    await MyGlobal.prisma.ats_recruitment_notification_failures.findUniqueOrThrow(
      {
        where: { id: failureId },
        select: {
          id: true,
          notification_id: true,
          delivery_id: true,
          failure_type: true,
          failure_message: true,
          occurred_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  return {
    id: failure.id,
    notification_id: failure.notification_id,
    delivery_id:
      typeof failure.delivery_id === "string" ? failure.delivery_id : undefined,
    failure_type: failure.failure_type,
    failure_message: failure.failure_message,
    occurred_at: toISOStringSafe(failure.occurred_at),
    created_at: toISOStringSafe(failure.created_at),
    updated_at: toISOStringSafe(failure.updated_at),
    deleted_at: failure.deleted_at
      ? toISOStringSafe(failure.deleted_at)
      : undefined,
  };
}
