import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAuditLogArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLogArchive";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieves complete details of a specific audit log archive record by its ID.
 *
 * Provides the full metadata for an audit log archive, including organization
 * context, archive type, storage location, retention information, and creation
 * timestamp. Access is strictly limited to authenticated system
 * administrators.
 *
 * @param props - The input properties for the request
 * @param props.systemAdmin - Authenticated system admin payload (authorization
 *   enforced upstream)
 * @param props.auditLogArchiveId - UUID of the audit log archive record to
 *   retrieve
 * @returns Full details for the specified audit log archive record
 * @throws {Error} If the record with the given ID does not exist
 */
export async function gethealthcarePlatformSystemAdminAuditLogArchivesAuditLogArchiveId(props: {
  systemAdmin: SystemadminPayload;
  auditLogArchiveId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAuditLogArchive> {
  const archive =
    await MyGlobal.prisma.healthcare_platform_audit_log_archives.findUniqueOrThrow(
      {
        where: {
          id: props.auditLogArchiveId,
        },
        select: {
          id: true,
          organization_id: true,
          archive_type: true,
          archive_file_uri: true,
          retention_expiry_at: true,
          created_at: true,
        },
      },
    );

  return {
    id: archive.id,
    organization_id: archive.organization_id,
    archive_type: archive.archive_type,
    archive_file_uri: archive.archive_file_uri,
    retention_expiry_at: toISOStringSafe(archive.retention_expiry_at),
    created_at: toISOStringSafe(archive.created_at),
  };
}
