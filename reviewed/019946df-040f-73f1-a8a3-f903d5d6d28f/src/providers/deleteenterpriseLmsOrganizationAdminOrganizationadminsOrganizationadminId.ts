import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete an organization administrator user by their unique ID.
 *
 * This operation permanently removes the user record from the database.
 *
 * Only users with organizationAdmin role privileges belonging to the same
 * tenant can perform this deletion.
 *
 * @param props - Object containing the authenticated organizationAdmin and the
 *   target organizationadminId to delete
 * @param props.organizationAdmin - The authenticated organizationAdmin payload
 *   containing at least id and tenant_id for tenant isolation
 * @param props.organizationadminId - Unique identifier of the organization
 *   admin user to delete
 * @returns Void
 * @throws {Error} When the organization admin user is not found
 * @throws {Error} When the authenticated user is unauthorized to delete the
 *   target admin
 */
export async function deleteenterpriseLmsOrganizationAdminOrganizationadminsOrganizationadminId(props: {
  organizationAdmin: OrganizationadminPayload;
  organizationadminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, organizationadminId } = props;

  // Find the target organization admin user
  const targetAdmin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: organizationadminId },
    });

  if (!targetAdmin) {
    throw new Error("Not Found");
  }

  // Enforce tenant isolation
  if (targetAdmin.tenant_id !== organizationAdmin.tenant_id) {
    throw new Error("Unauthorized");
  }

  // Perform hard delete (physical deletion)
  await MyGlobal.prisma.enterprise_lms_organizationadmin.delete({
    where: { id: organizationadminId },
  });
}
