import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAuditLogArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLogArchive";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieves complete details of a specific audit log archive record by its ID.
 *
 * This operation provides detailed retrieval of all metadata and associated
 * context for a specific audit log archive batch, as referenced by
 * auditLogArchiveId in the healthcare_platform_audit_log_archives table.
 *
 * Authorization is enforced by ensuring the requesting organization
 * administrator exists. For stricter organization scope enforcement, schema
 * changes are required to link admins to organizations directly.
 *
 * @param props - The request parameter object
 * @param props.organizationAdmin - Authenticated payload for organization admin
 *   user
 * @param props.auditLogArchiveId - UUID of the requested audit log archive
 *   record
 * @returns Complete metadata, context, and storage details of the audit log
 *   archive record identified by the auditLogArchiveId
 * @throws {Error} When the requesting admin or archive is not found
 */
export async function gethealthcarePlatformOrganizationAdminAuditLogArchivesAuditLogArchiveId(props: {
  organizationAdmin: OrganizationadminPayload;
  auditLogArchiveId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAuditLogArchive> {
  // Step 1: Confirm that the requesting organization admin exists
  const orgAdmin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: props.organizationAdmin.id, deleted_at: null },
    });
  if (!orgAdmin) throw new Error("Organization admin not found or deleted");

  // Step 2: Fetch the requested audit log archive
  const archive =
    await MyGlobal.prisma.healthcare_platform_audit_log_archives.findFirst({
      where: { id: props.auditLogArchiveId },
    });
  if (!archive) throw new Error("Audit log archive not found");

  // Step 3: Map and convert fields for DTO compliance
  return {
    id: archive.id,
    organization_id: archive.organization_id,
    archive_type: archive.archive_type,
    archive_file_uri: archive.archive_file_uri,
    retention_expiry_at: toISOStringSafe(archive.retention_expiry_at),
    created_at: toISOStringSafe(archive.created_at),
  };
}
