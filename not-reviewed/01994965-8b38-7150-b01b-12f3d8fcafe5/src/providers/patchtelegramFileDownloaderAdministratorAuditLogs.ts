import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAuditLog";
import { IPageITelegramFileDownloaderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderAuditLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Searches and retrieves a paginated list of audit logs with date range
 * filtering and sorting.
 *
 * This operation allows administrators to review system audit trails for
 * compliance and troubleshooting. Filters by action timestamp date ranges and
 * supports pagination and sorting.
 *
 * @param props - Object containing the administrator payload and filter
 *   criteria.
 * @param props.administrator - The authenticated administrator payload.
 * @param props.body - The request body containing filtering, pagination, and
 *   sorting parameters.
 * @returns A paginated list of audit logs conforming to
 *   IPageITelegramFileDownloaderAuditLog.
 * @throws Error if the underlying database operation fails.
 */
export async function patchtelegramFileDownloaderAdministratorAuditLogs(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderAuditLog.IRequest;
}): Promise<IPageITelegramFileDownloaderAuditLog> {
  const { administrator, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    action_timestamp?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = { deleted_at: null };

  if (body.occurred_at_start !== null && body.occurred_at_start !== undefined) {
    where.action_timestamp = {
      ...where.action_timestamp,
      gte: body.occurred_at_start,
    };
  }
  if (body.occurred_at_end !== null && body.occurred_at_end !== undefined) {
    where.action_timestamp = {
      ...where.action_timestamp,
      lte: body.occurred_at_end,
    };
  }

  const allowedSortBy = new Set([
    "action_timestamp",
    "created_at",
    "updated_at",
  ]);
  const sortBy =
    body.sort_by && allowedSortBy.has(body.sort_by)
      ? body.sort_by
      : "action_timestamp";
  const sortOrder =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_audit_logs.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.telegram_file_downloader_audit_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: results.map((item) => ({
      id: item.id,
      user_id: item.user_id ?? undefined,
      action_type: item.action_type,
      entity_type: item.entity_type,
      entity_id: item.entity_id ?? undefined,
      action_timestamp: toISOStringSafe(item.action_timestamp),
      ip_address: item.ip_address ?? undefined,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
