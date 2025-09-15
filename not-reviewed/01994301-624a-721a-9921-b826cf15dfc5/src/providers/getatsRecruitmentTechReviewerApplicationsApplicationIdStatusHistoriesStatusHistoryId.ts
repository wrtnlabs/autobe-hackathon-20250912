import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationStatusHistory";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Get details for a specific application status history record
 * (ats_recruitment_application_status_histories).
 *
 * Retrieves the details of an individual application status history entry via
 * its unique identifier. Used to examine exactly how and when a status
 * transition occurred for auditing, compliance, or HR process review. Entry
 * includes before/after status, who triggered the change, when, and an optional
 * change comment.
 *
 * Authorization: Only authenticated technical reviewers (techReviewer) are
 * permitted to access this endpoint.
 *
 * @param props - Request parameters and authentication context
 * @param props.techReviewer - The authenticated technical reviewer making the
 *   request
 * @param props.applicationId - Unique identifier for the parent application for
 *   this status change record
 * @param props.statusHistoryId - Unique identifier of the specific status
 *   history record to retrieve
 * @returns Full details of the status transition entry, including actor,
 *   before/after status, timestamp, and optional comment
 * @throws {Error} When the status history entry is not found or does not match
 *   the specified applicationId
 */
export async function getatsRecruitmentTechReviewerApplicationsApplicationIdStatusHistoriesStatusHistoryId(props: {
  techReviewer: TechreviewerPayload;
  applicationId: string & tags.Format<"uuid">;
  statusHistoryId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentApplicationStatusHistory> {
  const { techReviewer, applicationId, statusHistoryId } = props;

  // Fetch by both applicationId and statusHistoryId for strict scoping
  const record =
    await MyGlobal.prisma.ats_recruitment_application_status_histories.findFirst(
      {
        where: {
          id: statusHistoryId,
          application_id: applicationId,
        },
      },
    );
  if (!record) {
    throw new Error(
      "Status history entry not found for given applicationId and statusHistoryId",
    );
  }

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
