import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Fetch the complete configuration details for a specific external EMR
 * connector by ID.
 *
 * This operation allows an organization administrator to retrieve full
 * configuration and status details of a single external EMR/EHR connector,
 * scoped strictly to their organization. It enforces access authorization and
 * soft delete rules, returning vendor, endpoint, sync, and status metadata as
 * required for integration administration and compliance. All date fields are
 * safely formatted as ISO strings.
 *
 * @param props Object containing required parameters
 * @param props.organizationAdmin Authenticated OrganizationadminPayload (must
 *   be admin for the organization)
 * @param props.externalEmrConnectorId Unique UUID of the external EMR connector
 *   to fetch
 * @returns The full detail IHealthcarePlatformExternalEmrConnector for the
 *   connector (if found and authorized)
 * @throws {Error} If admin or connector are not found, deleted, or if
 *   authorization fails
 */
export async function gethealthcarePlatformOrganizationAdminExternalEmrConnectorsExternalEmrConnectorId(props: {
  organizationAdmin: OrganizationadminPayload;
  externalEmrConnectorId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformExternalEmrConnector> {
  const { organizationAdmin, externalEmrConnectorId } = props;

  // Step 1: Resolve Organization for admin (must not be deleted)
  const activeAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!activeAssignment)
    throw new Error("Organization admin assignment not found or not active.");

  // Step 2: Fetch connector (must match org and not be soft-deleted)
  const connector =
    await MyGlobal.prisma.healthcare_platform_external_emr_connectors.findFirst(
      {
        where: {
          id: externalEmrConnectorId,
          healthcare_platform_organization_id:
            activeAssignment.healthcare_platform_organization_id,
          deleted_at: null,
        },
      },
    );
  if (!connector)
    throw new Error("External EMR connector not found or not accessible.");

  // Step 3: Map and convert all required fields (dates as string & tags.Format<'date-time'>)
  return {
    id: connector.id,
    healthcare_platform_organization_id:
      connector.healthcare_platform_organization_id,
    connector_type: connector.connector_type,
    connection_uri: connector.connection_uri,
    status: connector.status,
    last_sync_at: connector.last_sync_at
      ? toISOStringSafe(connector.last_sync_at)
      : undefined,
    created_at: toISOStringSafe(connector.created_at),
    updated_at: toISOStringSafe(connector.updated_at),
    deleted_at: connector.deleted_at
      ? toISOStringSafe(connector.deleted_at)
      : undefined,
  };
}
