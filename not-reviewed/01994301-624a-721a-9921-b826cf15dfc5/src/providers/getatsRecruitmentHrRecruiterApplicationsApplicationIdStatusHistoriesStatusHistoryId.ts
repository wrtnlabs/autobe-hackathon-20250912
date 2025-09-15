import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationStatusHistory";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

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
 * This endpoint allows authorized HR recruiters to fetch complete details of a
 * specific application status history record given an applicationId and
 * statusHistoryId. Returned data covers from_status, to_status, timestamps,
 * actor (HR or reviewer), and any freeform reason/comment attached during
 * status transition. Essential for examining the rationale or justification for
 * specific state changes in compliance audits and operational investigations.
 *
 * Authorization: Only available to authenticated HR recruiters; enforcement is
 * handled via HrrecruiterAuth decorator and provider logic.
 *
 * @param props - Parameters required for lookup:
 *
 *   - HrRecruiter: Authenticated HR recruiter making the request
 *   - ApplicationId: UUID of the parent application
 *   - StatusHistoryId: UUID of the specific status history entry
 *
 * @returns IAtsRecruitmentApplicationStatusHistory - Record of status history,
 *   with all required audit details
 * @throws {Error} When the status history entry does not exist (by
 *   id/application), or not visible per policy
 */
export async function getatsRecruitmentHrRecruiterApplicationsApplicationIdStatusHistoriesStatusHistoryId(props: {
  hrRecruiter: HrrecruiterPayload;
  applicationId: string & tags.Format<"uuid">;
  statusHistoryId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentApplicationStatusHistory> {
  const { applicationId, statusHistoryId } = props;

  const record =
    await MyGlobal.prisma.ats_recruitment_application_status_histories.findFirst(
      {
        where: {
          id: statusHistoryId,
          application_id: applicationId,
        },
      },
    );

  if (!record) throw new Error("Status history not found");

  return {
    id: record.id,
    application_id: record.application_id,
    actor_id: record.actor_id === null ? undefined : record.actor_id,
    from_status: record.from_status,
    to_status: record.to_status,
    changed_at: toISOStringSafe(record.changed_at),
    change_comment:
      record.change_comment === null ? undefined : record.change_comment,
    created_at: toISOStringSafe(record.created_at),
  };
}
