import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationStatusHistory";
import { IPageIAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicationStatusHistory";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * List status change histories for a specific application
 * (ats_recruitment_application_status_histories).
 *
 * Retrieves the status change history associated with a specific job
 * application in the ATS system. This operation queries the
 * ats_recruitment_application_status_histories table, filtering entries linked
 * by applicationId. It supports advanced search, filtering, and pagination
 * based on actor, timestamps, status transitions, and comments. Especially
 * important for HR recruiters to audit candidate progression and for
 * compliance/reporting. Follows multi-actor audit trails and includes HR/tech
 * reviewer links as well as timestamped status transitions.
 *
 * @param props - TechReviewer: The authenticated tech reviewer making the
 *   request. applicationId: Unique identifier of the target job application
 *   whose status histories are being retrieved. body: Optional search, filter,
 *   and pagination parameters for status history entries of an application.
 * @returns Paginated response containing status history entries, each detailing
 *   transition, actor, and timestamp.
 * @throws {Error} When application does not exist, or on internal data access
 *   error.
 */
export async function patchatsRecruitmentTechReviewerApplicationsApplicationIdStatusHistories(props: {
  techReviewer: TechreviewerPayload;
  applicationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplicationStatusHistory.IRequest;
}): Promise<IPageIAtsRecruitmentApplicationStatusHistory> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort: "asc" | "desc" = props.body.sort === "asc" ? "asc" : "desc";

  // Application existence check (throw if not found)
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findUnique({
      where: { id: props.applicationId },
      select: { id: true },
    });
  if (!application) {
    throw new Error("Application not found");
  }

  // Build filter conditions: all undefined/null checks are required by schema compatibility
  const where = {
    application_id: props.applicationId,
    ...(props.body.actor_id !== undefined &&
      props.body.actor_id !== null && { actor_id: props.body.actor_id }),
    ...(props.body.from_status !== undefined &&
      props.body.from_status !== null && {
        from_status: props.body.from_status,
      }),
    ...(props.body.to_status !== undefined &&
      props.body.to_status !== null && { to_status: props.body.to_status }),
    ...(props.body.changed_at_from !== undefined &&
    props.body.changed_at_from !== null &&
    props.body.changed_at_to !== undefined &&
    props.body.changed_at_to !== null
      ? {
          changed_at: {
            gte: props.body.changed_at_from,
            lte: props.body.changed_at_to,
          },
        }
      : props.body.changed_at_from !== undefined &&
          props.body.changed_at_from !== null
        ? { changed_at: { gte: props.body.changed_at_from } }
        : props.body.changed_at_to !== undefined &&
            props.body.changed_at_to !== null
          ? { changed_at: { lte: props.body.changed_at_to } }
          : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_application_status_histories.findMany({
      where,
      orderBy: { changed_at: sort },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_application_status_histories.count({
      where,
    }),
  ]);

  // Transform raw DB records to API contract format (all dates via toISOStringSafe)
  const data = rows.map((row) => {
    const obj: IAtsRecruitmentApplicationStatusHistory = {
      id: row.id,
      application_id: row.application_id,
      from_status: row.from_status,
      to_status: row.to_status,
      changed_at: toISOStringSafe(row.changed_at),
      created_at: toISOStringSafe(row.created_at),
    };
    if (row.actor_id !== undefined && row.actor_id !== null) {
      obj.actor_id = row.actor_id;
    }
    if (row.change_comment !== undefined && row.change_comment !== null) {
      obj.change_comment = row.change_comment;
    }
    return obj;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
