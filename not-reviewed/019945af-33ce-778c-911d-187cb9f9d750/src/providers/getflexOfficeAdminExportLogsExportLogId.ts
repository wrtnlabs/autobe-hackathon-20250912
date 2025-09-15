import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExportLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed export log by its unique ID.
 *
 * This operation fetches the full details of a specific export log entry from
 * the FlexOffice analytics export audit trail. Access is restricted to
 * authorized admin users.
 *
 * @param props - Object containing the admin authentication and exportLogId.
 * @param props.admin - The authenticated admin making the request.
 * @param props.exportLogId - UUID of the export log to retrieve.
 * @returns The full export log details conforming to IFlexOfficeExportLog.
 * @throws {Error} Throws if the export log with the given ID does not exist.
 */
export async function getflexOfficeAdminExportLogsExportLogId(props: {
  admin: AdminPayload;
  exportLogId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeExportLog> {
  const { exportLogId } = props;

  const record =
    await MyGlobal.prisma.flex_office_export_logs.findUniqueOrThrow({
      where: { id: exportLogId },
    });

  return {
    id: record.id,
    export_type: record.export_type,
    target_object: record.target_object,
    status: record.status,
    executed_by_user_id: record.executed_by_user_id,
    executed_at: toISOStringSafe(record.executed_at),
    created_at: toISOStringSafe(record.created_at),
  };
}
