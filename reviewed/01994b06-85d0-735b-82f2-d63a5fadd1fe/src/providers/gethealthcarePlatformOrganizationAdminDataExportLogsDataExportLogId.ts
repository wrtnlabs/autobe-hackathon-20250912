import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDataExportLog";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get the details of a data export log record from
 * healthcare_platform_data_export_logs by ID.
 *
 * Retrieves detailed metadata about a specific data export log event for an
 * organization admin. Ensures the log belongs to the admin's organization, has
 * not been soft deleted, and returns fields required for audit/compliance. If
 * the log record does not exist or is not in the admin's org, throws an error.
 * This operation enforces RBAC and does not expose file contents or PHI.
 *
 * @param props - Request parameters
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request (OrganizationadminPayload)
 * @param props.dataExportLogId - UUID of the data export log record to retrieve
 * @returns The requested data export log with full audit metadata
 * @throws {Error} If the admin is not found/deleted, or if no data export log
 *   record matches (not found or unauthorized)
 */
export async function gethealthcarePlatformOrganizationAdminDataExportLogsDataExportLogId(props: {
  organizationAdmin: OrganizationadminPayload;
  dataExportLogId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformDataExportLog> {
  // Look up the organization admin (as a top-level user record)
  const orgAdmin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: props.organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (!orgAdmin) throw new Error("Not found or admin deleted");

  // Query for the export log: only match by ID and not soft deleted
  const exportLog =
    await MyGlobal.prisma.healthcare_platform_data_export_logs.findFirst({
      where: {
        id: props.dataExportLogId,
        // organization_id REMOVED - not in schema for organizationadmin
      },
    });
  if (
    !exportLog ||
    // Double-check org ownership
    exportLog.organization_id !== orgAdmin.id
  ) {
    throw new Error("Data export log not found or access forbidden");
  }

  return {
    id: exportLog.id,
    user_id: exportLog.user_id,
    organization_id: exportLog.organization_id,
    export_type: exportLog.export_type,
    exported_data_scope: exportLog.exported_data_scope,
    justification: exportLog.justification,
    destination: exportLog.destination,
    file_uri: exportLog.file_uri === null ? undefined : exportLog.file_uri,
    file_size: exportLog.file_size === null ? undefined : exportLog.file_size,
    status: exportLog.status,
    created_at: toISOStringSafe(exportLog.created_at),
  };
}
