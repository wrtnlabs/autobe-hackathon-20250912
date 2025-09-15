import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete (hard remove) an external EMR connector
 * (healthcare_platform_external_emr_connectors).
 *
 * This operation irreversibly deletes an external EMR connector configuration
 * by its unique identifier. Only organization administrators
 * (organizationAdmin) are authorized to perform this action, and deletion is
 * permitted strictly for connectors that belong to the organization(s) the
 * admin manages. The removal is immediate and final (no soft delete). All
 * deletions are recorded in the audit log to ensure full compliance and
 * traceability. The operation will fail if the connector does not exist, is
 * already deleted, or does not belong to the admin's organization(s).
 *
 * @param props - OrganizationAdmin: The authenticated organization admin user
 *   (OrganizationadminPayload) externalEmrConnectorId: The unique UUID of the
 *   external EMR connector to be deleted
 * @returns Void
 * @throws {Error} If the connector does not exist, is already deleted, or the
 *   admin lacks permission
 */
export async function deletehealthcarePlatformOrganizationAdminExternalEmrConnectorsExternalEmrConnectorId(props: {
  organizationAdmin: OrganizationadminPayload;
  externalEmrConnectorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, externalEmrConnectorId } = props;

  // Find connector
  const connector =
    await MyGlobal.prisma.healthcare_platform_external_emr_connectors.findUnique(
      {
        where: { id: externalEmrConnectorId },
        select: {
          id: true,
          healthcare_platform_organization_id: true,
        },
      },
    );
  if (!connector) {
    throw new Error("External EMR connector not found");
  }

  // Lookup organization assignment for this admin
  // Only allow delete if connector belongs to this admin's organization
  const adminAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: { user_id: organizationAdmin.id, deleted_at: null },
      select: { healthcare_platform_organization_id: true },
    });
  if (!adminAssignment) {
    throw new Error(
      "Organization admin does not have a valid organization assignment",
    );
  }
  if (
    adminAssignment.healthcare_platform_organization_id !==
    connector.healthcare_platform_organization_id
  ) {
    throw new Error(
      "Permission denied. Admin cannot delete connector in organizations they do not administer.",
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.healthcare_platform_external_emr_connectors.delete({
    where: { id: externalEmrConnectorId },
  });

  // Audit log the deletion
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: organizationAdmin.id,
      organization_id: connector.healthcare_platform_organization_id,
      action_type: "EXTERNAL_EMR_CONNECTOR_DELETE",
      related_entity_type: "healthcare_platform_external_emr_connectors",
      related_entity_id: externalEmrConnectorId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
