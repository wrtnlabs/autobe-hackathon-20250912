import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Updates the configuration or metadata of an existing external EMR (Electronic
 * Medical Record) connector for an organization.
 *
 * This operation allows a system administrator to modify EMR/EHR connector
 * properties—such as type, URI, operational status, or soft-deletion marker.
 * Strict privilege and audit checks are enforced: only connectors that exist
 * and are not already soft-deleted (deleted_at=null) are updatable.
 *
 * All configuration updates are recorded, with updated_at modified to the
 * current timestamp for auditing and compliance. Date and datetime properties
 * are always returned as ISO 8601 strings.
 *
 * @param props - Function parameters
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the update (must have type: "systemAdmin")
 * @param props.externalEmrConnectorId - UUID of the external EMR connector to
 *   update
 * @param props.body - Partial update object, may include connector_type,
 *   connection_uri, status, or deleted_at
 * @returns IHealthcarePlatformExternalEmrConnector - The updated connector's
 *   properties including all date/times as branded strings
 * @throws {Error} If the connector does not exist or has been deleted, or if
 *   privileges are insufficient
 */
export async function puthealthcarePlatformSystemAdminExternalEmrConnectorsExternalEmrConnectorId(props: {
  systemAdmin: SystemadminPayload;
  externalEmrConnectorId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformExternalEmrConnector.IUpdate;
}): Promise<IHealthcarePlatformExternalEmrConnector> {
  const { systemAdmin, externalEmrConnectorId, body } = props;

  // Enforce required admin authorization
  if (!systemAdmin || systemAdmin.type !== "systemAdmin") {
    throw new Error("Unauthorized: system administrator privileges required");
  }

  // Fetch and validate existing connector (must not be soft deleted)
  const connector =
    await MyGlobal.prisma.healthcare_platform_external_emr_connectors.findFirst(
      {
        where: { id: externalEmrConnectorId, deleted_at: null },
      },
    );
  if (!connector) {
    throw new Error("Connector not found or has been deleted");
  }

  // Prepare and execute update with supplied fields only
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_external_emr_connectors.update({
      where: { id: externalEmrConnectorId },
      data: {
        connector_type: body.connector_type ?? undefined,
        connection_uri: body.connection_uri ?? undefined,
        status: body.status ?? undefined,
        deleted_at: body.deleted_at ?? undefined,
        updated_at: now,
      },
    });

  // Return DTO with all datetime fields converted and null-handled per schema
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    connector_type: updated.connector_type,
    connection_uri: updated.connection_uri,
    status: updated.status,
    last_sync_at: updated.last_sync_at
      ? toISOStringSafe(updated.last_sync_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined" || updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
