import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentDataDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentDataDeletionLog";
import { IPageIAtsRecruitmentDataDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentDataDeletionLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Paginated, filterable search of data deletion logs
 * (ats_recruitment_data_deletion_logs) for compliance/GDPR audit
 *
 * This endpoint enables system administrators to search and audit data deletion
 * events in the ATS recruitment system. System admins can apply multiple
 * filters (requestor ID, type, target type/ID, deletion reason, and timestamp
 * range) and receive paginated responses ordered by deletion time descending.
 * All date-time fields are consistently presented as ISO 8601 formatted
 * strings. Only users with systemAdmin authorization may access this endpoint;
 * unauthorized access yields an error. Edge case: if no logs match, returns
 * pagination and empty data.
 *
 * @param props - Function input containing the authenticated systemAdmin and
 *   filter body
 * @param props.systemAdmin - JWT-authenticated SystemadminPayload representing
 *   the current system admin user
 * @param props.body - Filtering, sorting, and pagination parameters for the
 *   data deletion log audit
 * @returns Paginated list of data deletion log entries with full metadata per
 *   record
 * @throws {Error} If systemAdmin is missing or unauthorized to audit deletion
 *   logs
 */
export async function patchatsRecruitmentSystemAdminDataDeletionLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentDataDeletionLog.IRequest;
}): Promise<IPageIAtsRecruitmentDataDeletionLog> {
  const { systemAdmin, body } = props;

  // Default pagination (strict positive minimum)
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build type-safe where clause
  const where = {
    ...(body.requestor_id !== undefined &&
      body.requestor_id !== null && {
        requestor_id: body.requestor_id,
      }),
    ...(body.requestor_type !== undefined &&
      body.requestor_type !== null && {
        requestor_type: body.requestor_type,
      }),
    ...(body.target_type !== undefined &&
      body.target_type !== null && {
        target_type: body.target_type,
      }),
    ...(body.target_id !== undefined &&
      body.target_id !== null && {
        target_id: body.target_id,
      }),
    ...(body.deletion_reason !== undefined &&
      body.deletion_reason !== null && {
        deletion_reason: body.deletion_reason,
      }),
    ...((body.deleted_at_from !== undefined && body.deleted_at_from !== null) ||
    (body.deleted_at_to !== undefined && body.deleted_at_to !== null)
      ? {
          deleted_at: {
            ...(body.deleted_at_from !== undefined &&
              body.deleted_at_from !== null && {
                gte: body.deleted_at_from,
              }),
            ...(body.deleted_at_to !== undefined &&
              body.deleted_at_to !== null && {
                lte: body.deleted_at_to,
              }),
          },
        }
      : {}),
  };

  // Query in parallel for results and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_data_deletion_logs.findMany({
      where,
      orderBy: { deleted_at: "desc" },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.ats_recruitment_data_deletion_logs.count({ where }),
  ]);

  // Map to DTO, converting date fields and propagating only type-compliant values
  const data = rows.map((row) => ({
    id: row.id,
    deleted_at: toISOStringSafe(row.deleted_at),
    requestor_id: row.requestor_id,
    requestor_type: row.requestor_type,
    target_type: row.target_type,
    target_id: row.target_id,
    deletion_reason: row.deletion_reason,
    outcome_note:
      row.outcome_note !== undefined && row.outcome_note !== null
        ? row.outcome_note
        : undefined,
  }));

  const pageValue = Number(page);
  const limitValue = Number(limit);

  // Pagination calculation
  return {
    pagination: {
      current: pageValue,
      limit: limitValue,
      records: total,
      pages: limitValue > 0 ? Math.ceil(total / limitValue) : 0,
    },
    data,
  };
}
