import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceLog";
import { IPageIFlexOfficeDataSourceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSourceLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a filtered and paginated list of data source log entries for
 * administrators.
 *
 * This operation supports filtering by data source ID, log level, message
 * content, user ID, and timestamp ranges. It paginates results based on the
 * page and limit provided.
 *
 * Requires administrative privileges.
 *
 * @param props - Object containing the admin authentication payload and
 *   filtering criteria.
 * @param props.admin - The authenticated admin user's payload.
 * @param props.body - Filter and pagination criteria for the data source logs.
 * @returns A paginated summary of data source log entries matching the filter
 *   criteria.
 * @throws {Error} When database operations fail or unexpected errors occur.
 */
export async function patchflexOfficeAdminDataSourceLogs(props: {
  admin: AdminPayload;
  body: IFlexOfficeDataSourceLog.IRequest;
}): Promise<IPageIFlexOfficeDataSourceLog.ISummary> {
  const { admin, body } = props;

  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.flex_office_data_source_id !== undefined &&
      body.flex_office_data_source_id !== null && {
        flex_office_data_source_id: body.flex_office_data_source_id,
      }),
    ...(body.log_level !== undefined &&
      body.log_level !== null && {
        log_level: body.log_level,
      }),
    ...(body.message !== undefined &&
      body.message !== null && {
        message: { contains: body.message },
      }),
    ...(body.user_id !== undefined &&
      body.user_id !== null && {
        user_id: body.user_id,
      }),
    ...((body.timestamp_from !== undefined && body.timestamp_from !== null) ||
    (body.timestamp_to !== undefined && body.timestamp_to !== null)
      ? {
          timestamp: {
            ...(body.timestamp_from !== undefined &&
            body.timestamp_from !== null
              ? { gte: body.timestamp_from }
              : {}),
            ...(body.timestamp_to !== undefined && body.timestamp_to !== null
              ? { lte: body.timestamp_to }
              : {}),
          },
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_data_source_logs.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_data_source_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((log) => ({
      id: log.id,
      log_level: log.log_level,
      timestamp: toISOStringSafe(log.timestamp),
      message: log.message,
      created_at: toISOStringSafe(log.created_at),
      updated_at: toISOStringSafe(log.updated_at),
    })),
  };
}
