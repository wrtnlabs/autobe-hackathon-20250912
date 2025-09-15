import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Erase (hard-delete) an organization administrator by ID
 * (healthcare_platform_organizationadmins)
 *
 * Permanently deletes the specified organization admin record from the
 * database, fully erasing administrator details. This operation is restricted
 * to authenticated organization administrators and is not reversible. An
 * immutable audit log is always written for compliance and traceability.
 *
 * Business constraints:
 *
 * - Only authorized organization admins may perform this action
 * - The admin must exist and not be already deleted
 * - No soft-delete occurs; the record is erased
 * - An audit log is created detailing the erased admin's ID
 *
 * @param props - Properties for the operation
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the deletion
 * @param props.organizationAdminId - The UUID of the target organization admin
 *   to hard-delete
 * @returns Void (nothing)
 * @throws {Error} If the admin does not exist, is already deleted, or is
 *   protected by dependencies
 */
export async function deletehealthcarePlatformOrganizationAdminOrganizationadminsOrganizationAdminId(props: {
  organizationAdmin: OrganizationadminPayload;
  organizationAdminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, organizationAdminId } = props;

  // 1. Confirm the admin exists (not already deleted)
  const target =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdminId },
    });
  if (!target) {
    throw new Error("Organization admin not found or already deleted.");
  }

  // 2. Perform hard delete (irreversible)
  await MyGlobal.prisma.healthcare_platform_organizationadmins.delete({
    where: { id: organizationAdminId },
  });

  // 3. Write an audit trail entry for compliance
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: organizationAdmin.id,
      organization_id: null,
      action_type: "ORGANIZATIONADMIN_DELETE",
      event_context: JSON.stringify({ deleted_admin_id: organizationAdminId }),
      ip_address: undefined,
      related_entity_type: "organizationadmin",
      related_entity_id: organizationAdminId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
