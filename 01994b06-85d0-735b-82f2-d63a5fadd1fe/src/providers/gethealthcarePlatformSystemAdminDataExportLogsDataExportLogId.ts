import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDataExportLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get the details of a data export log record from
 * healthcare_platform_data_export_logs by ID.
 *
 * Retrieves the detailed metadata for a single data export log given its unique
 * identifier. Only returns metadata for auditing, regulatory, or operational
 * review; no PHI or file payload is ever returned.
 *
 * Only system administrators are allowed to access this endpoint. If the record
 * is not found, throws an error.
 *
 * @param props - Properties for this operation
 * @param props.systemAdmin - The authenticated system admin making this request
 * @param props.dataExportLogId - Unique identifier (UUID) of the export log
 *   record to retrieve
 * @returns IHealthcarePlatformDataExportLog - All metadata fields for the
 *   export event
 * @throws {Error} If no export log is found matching the provided id
 */
export async function gethealthcarePlatformSystemAdminDataExportLogsDataExportLogId(props: {
  systemAdmin: SystemadminPayload;
  dataExportLogId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformDataExportLog> {
  const { dataExportLogId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_data_export_logs.findUnique({
      where: { id: dataExportLogId },
    });
  if (!record) throw new Error("Data export log not found");
  return {
    id: record.id,
    user_id: record.user_id,
    organization_id: record.organization_id,
    export_type: record.export_type,
    exported_data_scope: record.exported_data_scope,
    justification: record.justification,
    destination: record.destination,
    file_uri: record.file_uri === null ? undefined : record.file_uri,
    file_size: record.file_size === null ? undefined : record.file_size,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
  };
}
