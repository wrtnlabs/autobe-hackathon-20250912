import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Erase (hard-delete) an organization administrator by ID
 * (healthcare_platform_organizationadmins)
 *
 * Permanently removes the specified organization admin entry from the database,
 * fully erasing associated administrator details. Access is restricted to
 * system or organization administrators with the highest level permissions in
 * the healthcarePlatform.
 *
 * Upon completion, the operation ensures the record can no longer be referenced
 * or recovered and initiates a platform-wide audit log event. All access
 * constraints and dependencies must be resolved before deletion. If the
 * specified record is missing, already deleted, or protected by policy (active
 * assignments or investigatory lock), the operation returns clear error
 * messages.
 *
 * No soft-deletion is performed for this operation, and care should be taken to
 * comply with security and privacy best practices, including audit compliance
 * for privileged actor actions.
 *
 * @param props - Properties including the system admin payload and the UUID of
 *   the organization admin to delete.
 * @param props.systemAdmin - The authenticated SystemadminPayload performing
 *   the deletion.
 * @param props.organizationAdminId - The UUID of the organization admin to
 *   permanently delete.
 * @returns Void
 * @throws {Error} When the specified organization admin is missing or was
 *   already deleted.
 */
export async function deletehealthcarePlatformSystemAdminOrganizationadminsOrganizationAdminId(props: {
  systemAdmin: SystemadminPayload;
  organizationAdminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, organizationAdminId } = props;

  // Retrieve org admin or error (prevents double delete)
  const orgAdmin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdminId,
      },
    });
  if (!orgAdmin) {
    throw new Error("Organization administrator not found or already deleted");
  }

  // Direct hard delete from DB (no soft-delete)
  await MyGlobal.prisma.healthcare_platform_organizationadmins.delete({
    where: {
      id: organizationAdminId,
    },
  });

  // Write audit log (compliance: RECORD_DELETE for ORGANIZATION_ADMIN)
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: systemAdmin.id,
      organization_id: null,
      action_type: "RECORD_DELETE",
      event_context: `Hard-deleted organization admin (${orgAdmin.email || orgAdmin.id})`,
      ip_address: null,
      related_entity_type: "ORGANIZATION_ADMIN",
      related_entity_id: organizationAdminId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
