import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationStatusHistory";
import { IPageIAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicationStatusHistory";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * List status change histories for a specific application
 * (ats_recruitment_application_status_histories).
 *
 * This operation returns a comprehensive, paginated list of all status change
 * entries for the specified application in the recruiting system. Each entry
 * represents a status transition tracked for audit, reporting, and compliance.
 * Filtering, sorting, and pagination are supported. Only HR recruiters with
 * valid authentication are permitted. Entries are ordered per sort criteria
 * (default: newest first).
 *
 * @param props - Properties for retrieving application status histories
 * @param props.hrRecruiter - The authenticated HR recruiter performing this
 *   operation (authorization enforced)
 * @param props.applicationId - The UUID of the application whose status history
 *   is being queried
 * @param props.body - Optional filters, sort criteria, and pagination
 * @returns Paginated status history records for the specified application
 * @throws {Error} If the application does not exist, or the actor is not
 *   permitted to view history
 */
export async function patchatsRecruitmentHrRecruiterApplicationsApplicationIdStatusHistories(props: {
  hrRecruiter: HrrecruiterPayload;
  applicationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplicationStatusHistory.IRequest;
}): Promise<IPageIAtsRecruitmentApplicationStatusHistory> {
  const { hrRecruiter, applicationId, body } = props;

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip =
    typeof page === "number" && typeof limit === "number"
      ? (Number(page) - 1) * Number(limit)
      : 0;

  // Compose changed_at filter
  const changedAtFilter =
    (body.changed_at_from !== undefined && body.changed_at_from !== null) ||
    (body.changed_at_to !== undefined && body.changed_at_to !== null)
      ? {
          ...(body.changed_at_from !== undefined &&
            body.changed_at_from !== null && { gte: body.changed_at_from }),
          ...(body.changed_at_to !== undefined &&
            body.changed_at_to !== null && { lte: body.changed_at_to }),
        }
      : undefined;

  // Prisma where construction (do not include empty optional filters)
  const where = {
    application_id: applicationId,
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.from_status !== undefined &&
      body.from_status !== null && { from_status: body.from_status }),
    ...(body.to_status !== undefined &&
      body.to_status !== null && { to_status: body.to_status }),
    ...(changedAtFilter !== undefined && { changed_at: changedAtFilter }),
  };

  // Fetch count and result rows in parallel
  const [count, rows] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_application_status_histories.count({
      where,
    }),
    MyGlobal.prisma.ats_recruitment_application_status_histories.findMany({
      where,
      orderBy: { changed_at: body.sort ?? "desc" },
      skip: Number(skip),
      take: Number(limit),
    }),
  ]);

  // Row transformation: convert all date fields and handle nulls/undefineds
  const data = rows.map((row) => ({
    id: row.id,
    application_id: row.application_id,
    actor_id: row.actor_id === null ? undefined : row.actor_id,
    from_status: row.from_status,
    to_status: row.to_status,
    changed_at: toISOStringSafe(row.changed_at),
    change_comment:
      row.change_comment === null ? undefined : row.change_comment,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Response construction (normalize branded numbers)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(count),
      pages: Math.ceil(Number(count) / Number(limit)),
    },
    data,
  };
}
