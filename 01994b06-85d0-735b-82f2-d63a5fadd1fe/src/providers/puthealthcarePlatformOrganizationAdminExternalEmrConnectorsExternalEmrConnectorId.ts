import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an external EMR connector configuration
 * (healthcare_platform_external_emr_connectors).
 *
 * This operation allows an authorized organization administrator to update the
 * configuration, metadata, or soft-deletion of an existing external EMR/EHR
 * connector for their organization. Only connectors that belong to the same
 * organization and are not soft-deleted can be modified. Attempts to update
 * connectors from other organizations or soft-deleted connectors must throw an
 * error.
 *
 * All date and datetime values are handled as ISO 8601 branded strings (string
 * & tags.Format<'date-time'>). The operation updates the mutable
 * fields—connector_type, connection_uri, status, deleted_at—based on provided
 * input, and advances updated_at to the current time. All audit and compliance
 * logging is assumed to be handled out-of-band.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing the update
 * @param props.externalEmrConnectorId - The UUID of the EMR connector to update
 * @param props.body - Payload containing optional updates to connector type,
 *   URI, status, or soft-deletion
 * @returns The updated external EMR connector record in standard DTO format
 * @throws {Error} If the connector does not exist, is soft-deleted, or does not
 *   belong to the admin's organization
 */
export async function puthealthcarePlatformOrganizationAdminExternalEmrConnectorsExternalEmrConnectorId(props: {
  organizationAdmin: OrganizationadminPayload;
  externalEmrConnectorId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformExternalEmrConnector.IUpdate;
}): Promise<IHealthcarePlatformExternalEmrConnector> {
  const { organizationAdmin, externalEmrConnectorId, body } = props;

  // Lookup: Must find active (not soft-deleted) connector
  const connector =
    await MyGlobal.prisma.healthcare_platform_external_emr_connectors.findFirst(
      {
        where: {
          id: externalEmrConnectorId,
          deleted_at: null,
        },
      },
    );

  if (!connector) {
    throw new Error("Connector not found or has been deleted.");
  }

  // Retrieve admin's organization by joining user_org_assignments, then compare
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        assignment_status: "active",
        healthcare_platform_organization_id:
          connector.healthcare_platform_organization_id,
        deleted_at: null,
      },
    });

  if (!assignment) {
    throw new Error(
      "Forbidden: Cannot modify connector for another organization",
    );
  }

  // Build update data with allowed fields only, never using null for non-nullable
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const data = {
    ...(body.connector_type !== undefined && {
      connector_type: body.connector_type,
    }),
    ...(body.connection_uri !== undefined && {
      connection_uri: body.connection_uri,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
    updated_at: now,
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_external_emr_connectors.update({
      where: { id: externalEmrConnectorId },
      data,
    });

  // Return DTO, convert all dates, match optional/nullable semantics exactly
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    connector_type: updated.connector_type,
    connection_uri: updated.connection_uri,
    status: updated.status,
    last_sync_at: updated.last_sync_at
      ? toISOStringSafe(updated.last_sync_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined"
        ? undefined
        : updated.deleted_at
          ? toISOStringSafe(updated.deleted_at)
          : null,
  };
}
