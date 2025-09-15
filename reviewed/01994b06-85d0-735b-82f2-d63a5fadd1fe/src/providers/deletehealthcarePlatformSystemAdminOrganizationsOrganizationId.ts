import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently deletes an organization (top-level tenant) by organizationId
 * (UUID) from healthcare_platform_organizations.
 *
 * This function removes a healthcare organization from the system, operating a
 * hard delete. Only system-wide administrators may perform this action. It
 * ensures the organization exists and is not already deleted (not
 * soft-deleted), validates system admin privileges, and physically removes the
 * organization entry from the database. All cascading deletions of related
 * resources are managed by the underlying schema relations. Throws a
 * descriptive error if the organization is not found, already deleted, or if
 * the actor is not a valid system admin.
 *
 * @param props - Properties including the authenticated system admin and the
 *   target organization UUID
 * @param props.systemAdmin - Authenticated SystemadminPayload for authorization
 *   context
 * @param props.organizationId - UUID of the organization to delete (string &
 *   tags.Format<'uuid'>)
 * @returns Void
 * @throws {Error} If admin not found, invalid, or organization does not exist
 *   or is already deleted.
 */
export async function deletehealthcarePlatformSystemAdminOrganizationsOrganizationId(props: {
  systemAdmin: SystemadminPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, organizationId } = props;

  // Step 1: Ensure the system admin exists and is not soft-deleted
  const admin =
    await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst({
      where: {
        id: systemAdmin.id,
        deleted_at: null,
      },
    });
  if (!admin) {
    throw new Error("Access denied: System administrator not found or retired");
  }

  // Step 2: Ensure organization exists and has not been soft-deleted
  const org = await MyGlobal.prisma.healthcare_platform_organizations.findFirst(
    {
      where: {
        id: organizationId,
        deleted_at: null,
      },
    },
  );
  if (!org) {
    throw new Error("Organization not found or already deleted");
  }

  // Step 3: Perform a hard delete (physical removal, cascades activated)
  await MyGlobal.prisma.healthcare_platform_organizations.delete({
    where: { id: organizationId },
  });
}
