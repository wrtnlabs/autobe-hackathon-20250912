import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentMaskingLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentMaskingLog";
import { IPageIAtsRecruitmentMaskingLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentMaskingLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List/search data masking/anonymization logs (ats_recruitment_masking_logs)
 * for admin compliance review.
 *
 * This endpoint enables system administrators to search for and audit all data
 * masking (anonymization) events logged in the ats_recruitment_masking_logs
 * table, including when, why, and by whom sensitive information was masked.
 *
 * Access is strictly limited to authenticated systemAdmin users. Supports
 * advanced search filtering by actor, date range, entity type, reason, and
 * target record. Fully paginated to support audit and compliance reviews in
 * production environments.
 *
 * @param props - Object containing required authorization and search parameters
 * @param props.systemAdmin - The authenticated systemAdmin making the request
 * @param props.body - The search filters and pagination options
 * @returns Paginated list of masking log summaries matching search criteria
 * @throws {Error} If authorization or database error occurs
 */
export async function patchatsRecruitmentSystemAdminMaskingLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentMaskingLog.IRequest;
}): Promise<IPageIAtsRecruitmentMaskingLog.ISummary> {
  const { body } = props;
  // Pagination parameters with robust defaults
  const page: number =
    typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit: number =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 100;
  // Dynamically build where clause based on only provided fields
  const where = {
    ...(body.masked_by_id !== undefined &&
      body.masked_by_id !== null && { masked_by_id: body.masked_by_id }),
    ...(body.masked_by_type !== undefined &&
      body.masked_by_type !== null && { masked_by_type: body.masked_by_type }),
    ...(body.target_type !== undefined &&
      body.target_type !== null && { target_type: body.target_type }),
    ...(body.target_id !== undefined &&
      body.target_id !== null && { target_id: body.target_id }),
    ...(body.masking_reason !== undefined &&
      body.masking_reason !== null && { masking_reason: body.masking_reason }),
    ...((body.masked_at_from !== undefined && body.masked_at_from !== null) ||
    (body.masked_at_to !== undefined && body.masked_at_to !== null)
      ? {
          masked_at: {
            ...(body.masked_at_from !== undefined &&
              body.masked_at_from !== null && { gte: body.masked_at_from }),
            ...(body.masked_at_to !== undefined &&
              body.masked_at_to !== null && { lte: body.masked_at_to }),
          },
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_masking_logs.findMany({
      where,
      orderBy: { masked_at: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.ats_recruitment_masking_logs.count({ where }),
  ]);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      masked_at: toISOStringSafe(row.masked_at),
      masked_by_id: row.masked_by_id,
      masked_by_type: row.masked_by_type,
      target_type: row.target_type,
      target_id: row.target_id,
      masking_reason: row.masking_reason,
    })),
  };
}
