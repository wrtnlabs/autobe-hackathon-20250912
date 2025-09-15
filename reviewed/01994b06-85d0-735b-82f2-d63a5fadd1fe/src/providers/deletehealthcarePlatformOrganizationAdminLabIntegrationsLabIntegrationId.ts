import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft-delete an organization's laboratory integration
 * (healthcare_platform_lab_integrations).
 *
 * This operation allows an organization administrator to logically delete a
 * laboratory integration by marking its deleted_at timestamp. The integration
 * remains in the system for compliance and historical tracking but is disabled
 * for future workflows. Only an organization admin of the owning organization
 * may soft-delete integrations. Throws if already deleted, nonexistent, or on
 * permission error.
 *
 * @param props - Operation parameters
 * @param props.organizationAdmin - Authenticated organization admin requesting
 *   the operation
 * @param props.labIntegrationId - UUID of the lab integration to soft-delete
 * @throws {Error} When the integration is already deleted, does not exist, or
 *   admin lacks permission
 */
export async function deletehealthcarePlatformOrganizationAdminLabIntegrationsLabIntegrationId(props: {
  organizationAdmin: OrganizationadminPayload;
  labIntegrationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the lab integration, ensuring it's not already deleted
  const integration =
    await MyGlobal.prisma.healthcare_platform_lab_integrations.findFirst({
      where: {
        id: props.labIntegrationId,
        deleted_at: null,
      },
      select: {
        id: true,
        healthcare_platform_organization_id: true,
      },
    });
  if (!integration) {
    throw new Error("Lab integration not found or already deleted");
  }

  // 2. Lookup the admin's organization assignment
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: props.organizationAdmin.id,
        deleted_at: null,
      },
      select: {
        healthcare_platform_organization_id: true,
      },
    });
  if (!orgAssignment) {
    throw new Error(
      "Organization admin assignment not found or has been deleted",
    );
  }

  // 3. Check that the admin owns the integration
  if (
    orgAssignment.healthcare_platform_organization_id !==
    integration.healthcare_platform_organization_id
  ) {
    throw new Error(
      "Permission denied: Cannot delete integrations for other organizations",
    );
  }

  // 4. Perform soft delete by setting deleted_at
  await MyGlobal.prisma.healthcare_platform_lab_integrations.update({
    where: { id: props.labIntegrationId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
