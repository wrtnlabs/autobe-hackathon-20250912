import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBackupRecord";
import { IPageIEnterpriseLmsBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBackupRecord";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search backup records with filters and pagination.
 *
 * This operation retrieves backup record logs for disaster recovery auditing.
 * It supports optional filters for backup type and status, and paginates
 * results. Sorting can be specified via the 'sort' field (e.g.,
 * 'backup_timestamp desc'). Only active (non-deleted) records are returned.
 *
 * @param props - Request properties containing the system administrator payload
 *   and filter parameters.
 * @param props.systemAdmin - Authenticated system administrator payload.
 * @param props.body - Filter and pagination parameters for backup records.
 * @returns Paginated summary of backup records matching the criteria.
 * @throws {Error} Throws if any database or query error occurs.
 */
export async function patchenterpriseLmsSystemAdminBackupRecords(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsBackupRecord.IRequest;
}): Promise<IPageIEnterpriseLmsBackupRecord.ISummary> {
  const { body } = props;

  // Default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Build filter conditions, excluding soft deleted records
  const whereCondition = {
    deleted_at: null,
    ...(body.filterByType !== undefined &&
      body.filterByType !== null && {
        backup_type: body.filterByType,
      }),
    ...(body.filterByStatus !== undefined &&
      body.filterByStatus !== null && {
        status: body.filterByStatus,
      }),
  };

  // Parse sort string if provided, default to backup_timestamp desc
  let orderByCondition: { [key: string]: "asc" | "desc" } = {
    backup_timestamp: "desc",
  };
  if (body.sort) {
    const sortParts = body.sort.trim().split(/\s+/);
    const field = sortParts[0];
    const order = (sortParts[1] ?? "desc").toLowerCase();
    if (["asc", "desc"].includes(order)) {
      orderByCondition = { [field]: order as "asc" | "desc" };
    }
  }

  // Perform parallel DB queries
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_backup_records.findMany({
      where: whereCondition,
      orderBy: orderByCondition,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        backup_timestamp: true,
        backup_type: true,
        storage_location: true,
        backup_size_bytes: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_backup_records.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      backup_timestamp: toISOStringSafe(item.backup_timestamp),
      backup_type: item.backup_type,
      storage_location: item.storage_location,
      backup_size_bytes: item.backup_size_bytes,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
