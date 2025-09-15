import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed data source log entry by ID
 *
 * This operation fetches a single data source log record by its unique
 * identifier, including log level, message content, timestamp, and optionally
 * the associated user ID. Access is restricted to authorized administrators.
 *
 * @param props - Object containing the admin payload and logId to fetch
 * @param props.admin - The authenticated administrator making the request
 * @param props.logId - The UUID of the data source log entry to retrieve
 * @returns The detailed data source log entry
 * @throws {Error} When no log entry with the given ID exists
 */
export async function getflexOfficeAdminDataSourceLogsLogId(props: {
  admin: AdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeDataSourceLog> {
  const { admin, logId } = props;

  // Authorization is done outside this function by the admin payload presence

  const record =
    await MyGlobal.prisma.flex_office_data_source_logs.findUniqueOrThrow({
      where: { id: logId },
    });

  return {
    id: record.id,
    flex_office_data_source_id: record.flex_office_data_source_id,
    log_level: record.log_level,
    message: record.message,
    timestamp: toISOStringSafe(record.timestamp),
    user_id: record.user_id ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
