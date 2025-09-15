import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationStatusHistory";
import { IPageIAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicationStatusHistory";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List status change histories for a specific application.
 *
 * Retrieves the status change history associated with a specific job
 * application in the ATS system. Supports advanced search, filtering, sorting,
 * and pagination based on actor, timestamps, and status transitions. Includes
 * full transition details (before/after status, actor, comments, timestamps)
 * for audit and reporting.
 *
 * Only system administrators, HR recruiters, or technical reviewers may access
 * this endpoint in full detail. Throws errors for unauthorized or non-existent
 * applications per security policy.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator
 *   (authorization required)
 * @param props.applicationId - The target application (uuid) whose status
 *   history is being listed
 * @param props.body - Optional search, filter, and pagination parameters for
 *   the query
 * @returns Paginated status history entries for the application
 * @throws {Error} When application does not exist or if insufficient
 *   permissions
 */
export async function patchatsRecruitmentSystemAdminApplicationsApplicationIdStatusHistories(props: {
  systemAdmin: SystemadminPayload;
  applicationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplicationStatusHistory.IRequest;
}): Promise<IPageIAtsRecruitmentApplicationStatusHistory> {
  const { applicationId, body } = props;

  // Input normalization and pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  // Pagination calculations: skip/take
  const skip = (page - 1) * limit;

  // Build WHERE clause for Prisma
  const where = {
    application_id: applicationId,
    deleted_at: null,
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && {
        actor_id: body.actor_id,
      }),
    ...(body.from_status !== undefined &&
      body.from_status !== null && {
        from_status: body.from_status,
      }),
    ...(body.to_status !== undefined &&
      body.to_status !== null && {
        to_status: body.to_status,
      }),
    ...((body.changed_at_from !== undefined && body.changed_at_from !== null) ||
    (body.changed_at_to !== undefined && body.changed_at_to !== null)
      ? {
          changed_at: {
            ...(body.changed_at_from !== undefined &&
              body.changed_at_from !== null && {
                gte: body.changed_at_from,
              }),
            ...(body.changed_at_to !== undefined &&
              body.changed_at_to !== null && {
                lte: body.changed_at_to,
              }),
          },
        }
      : {}),
  };

  // Sort order (default to desc if not provided/invalid)
  const sort: "asc" | "desc" = body.sort === "asc" ? "asc" : "desc";

  // Fetch records and total count concurrently
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

  // Map DB rows to API DTO with date/time and nullable handling
  const data: IAtsRecruitmentApplicationStatusHistory[] = rows.map((row) => ({
    id: row.id,
    application_id: row.application_id,
    ...(row.actor_id !== null && row.actor_id !== undefined
      ? { actor_id: row.actor_id }
      : {}),
    from_status: row.from_status,
    to_status: row.to_status,
    changed_at: toISOStringSafe(row.changed_at),
    ...(row.change_comment !== null && row.change_comment !== undefined
      ? { change_comment: row.change_comment }
      : {}),
    created_at: toISOStringSafe(row.created_at),
  }));

  // Pagination block - force values to satisfy IPage.IPagination brand tags via Number()
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / (limit > 0 ? limit : 1))),
    },
    data,
  };
}
