import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch the complete configuration details for a specific external EMR
 * connector by ID.
 *
 * This function retrieves the detail view of an external EMR/EHR connector
 * configuration, including vendor type, endpoints, organization assignment,
 * status, and audit timestamps. Only accessible by system administrators for
 * multi-tenant platform RBAC control. All date/time values are safely converted
 * and strictly typed; non-existent records throw.
 *
 * @param props - Properties for the operation
 * @param props.systemAdmin - The authenticated SystemadminPayload (privileged
 *   role for operation)
 * @param props.externalEmrConnectorId - Unique identifier (UUID) for the
 *   connector
 * @returns Full configuration metadata for the given connector
 * @throws {Error} If the connector is not found by ID
 */
export async function gethealthcarePlatformSystemAdminExternalEmrConnectorsExternalEmrConnectorId(props: {
  systemAdmin: SystemadminPayload;
  externalEmrConnectorId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformExternalEmrConnector> {
  const { externalEmrConnectorId } = props;
  const result =
    await MyGlobal.prisma.healthcare_platform_external_emr_connectors.findUnique(
      {
        where: { id: externalEmrConnectorId },
      },
    );
  if (!result) {
    throw new Error("External EMR connector not found");
  }
  return {
    id: result.id,
    healthcare_platform_organization_id:
      result.healthcare_platform_organization_id,
    connector_type: result.connector_type,
    connection_uri: result.connection_uri,
    status: result.status,
    last_sync_at:
      typeof result.last_sync_at === "object" && result.last_sync_at !== null
        ? toISOStringSafe(result.last_sync_at)
        : (result.last_sync_at ?? undefined),
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at:
      typeof result.deleted_at === "object" && result.deleted_at !== null
        ? toISOStringSafe(result.deleted_at)
        : (result.deleted_at ?? undefined),
  };
}
