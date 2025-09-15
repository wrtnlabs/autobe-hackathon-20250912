import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationStatusHistory";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get details for a specific application status history record
 * (ats_recruitment_application_status_histories).
 *
 * Retrieves the details of an individual application status history entry from
 * ats_recruitment_application_status_histories via its unique identifier. Used
 * to examine exactly how and when a status transition occurred for auditing,
 * compliance, or HR process review. Entry includes before/after status, who
 * triggered the change, when, and an optional change comment.
 *
 * Authorization: SystemadminPayload required. Only system admins may access all
 * details for audit/compliance.
 *
 * @param props - Request parameters
 * @param props.systemAdmin - Authenticated system admin user (payload validated
 *   by auth middleware)
 * @param props.applicationId - UUID of the parent application for this status
 *   change record
 * @param props.statusHistoryId - UUID of the specific status history record to
 *   fetch
 * @returns Full details of the status transition, including actor, before/after
 *   status, timestamps, and optional comment.
 * @throws {Error} If the status history is not found for the given
 *   applicationId/statusHistoryId combination
 */
export async function getatsRecruitmentSystemAdminApplicationsApplicationIdStatusHistoriesStatusHistoryId(props: {
  systemAdmin: SystemadminPayload;
  applicationId: string & tags.Format<"uuid">;
  statusHistoryId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentApplicationStatusHistory> {
  const { applicationId, statusHistoryId } = props;

  const found =
    await MyGlobal.prisma.ats_recruitment_application_status_histories.findFirst(
      {
        where: {
          id: statusHistoryId,
          application_id: applicationId,
        },
      },
    );
  if (!found) {
    throw new Error("Status history not found");
  }

  return {
    id: found.id,
    application_id: found.application_id,
    actor_id: found.actor_id === null ? undefined : found.actor_id,
    from_status: found.from_status,
    to_status: found.to_status,
    changed_at: toISOStringSafe(found.changed_at),
    change_comment:
      found.change_comment === null ? undefined : found.change_comment,
    created_at: toISOStringSafe(found.created_at),
  };
}
