import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get the details of a specific lab integration connector
 * (healthcare_platform_lab_integrations).
 *
 * Fetches the full configuration and status details for a specific lab
 * integration from the healthcare_platform_lab_integrations table, enforcing
 * organization boundary by organizationAdmin role. Only organization admins can
 * access lab integration configurations that belong to their own organization;
 * otherwise, an error is thrown.
 *
 * @param props - Request parameters
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request (OrganizationadminPayload, id = admin user id, not org id)
 * @param props.labIntegrationId - The UUID of the requested lab integration
 * @returns The detailed configuration of the lab integration connector
 * @throws {Error} If no such integration exists or the admin does not have
 *   access to it
 */
export async function gethealthcarePlatformOrganizationAdminLabIntegrationsLabIntegrationId(props: {
  organizationAdmin: OrganizationadminPayload;
  labIntegrationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformLabIntegration> {
  const { organizationAdmin, labIntegrationId } = props;
  // STEP 1: Find the admin's organization (from admin id)
  const adminAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        deleted_at: null,
        assignment_status: "active",
      },
      select: {
        healthcare_platform_organization_id: true,
      },
    });
  if (!adminAssignment)
    throw new Error(
      "Organization admin does not belong to any active organization.",
    );
  const orgId = adminAssignment.healthcare_platform_organization_id;

  // STEP 2: Fetch the lab integration only if it belongs to this org and is not deleted
  const integration =
    await MyGlobal.prisma.healthcare_platform_lab_integrations.findFirst({
      where: {
        id: labIntegrationId,
        healthcare_platform_organization_id: orgId,
        deleted_at: null,
      },
    });
  if (!integration)
    throw new Error("Lab integration not found or not accessible.");
  return {
    id: integration.id,
    healthcare_platform_organization_id:
      integration.healthcare_platform_organization_id,
    lab_vendor_code: integration.lab_vendor_code,
    connection_uri: integration.connection_uri,
    supported_message_format: integration.supported_message_format,
    status: integration.status,
    created_at: toISOStringSafe(integration.created_at),
    updated_at: toISOStringSafe(integration.updated_at),
    deleted_at: integration.deleted_at
      ? toISOStringSafe(integration.deleted_at)
      : null,
  };
}
