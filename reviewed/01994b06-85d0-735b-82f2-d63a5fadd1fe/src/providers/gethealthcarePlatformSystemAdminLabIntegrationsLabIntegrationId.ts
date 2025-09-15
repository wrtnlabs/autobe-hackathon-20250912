import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get the details of a specific lab integration connector
 * (healthcare_platform_lab_integrations).
 *
 * Fetches the full configuration and status details for a specific lab
 * integration point, corresponding to a row in the
 * healthcare_platform_lab_integrations table. The result includes lab vendor
 * identity, connection URI, supported formats, status, timestamps and metadata
 * fields.
 *
 * Only accessible to authenticated system administrator users (systemAdmin
 * role).
 *
 * @param props - Request object containing authorization context and
 *   labIntegrationId.
 * @param props.systemAdmin - Authenticated Systemadmin payload (authorization
 *   enforced at controller layer).
 * @param props.labIntegrationId - UUID of the lab integration to fetch.
 * @returns The full IHealthcarePlatformLabIntegration metadata object for the
 *   requested row.
 * @throws {Error} If the specified labIntegrationId does not exist in the
 *   table.
 */
export async function gethealthcarePlatformSystemAdminLabIntegrationsLabIntegrationId(props: {
  systemAdmin: SystemadminPayload;
  labIntegrationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformLabIntegration> {
  const { labIntegrationId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_lab_integrations.findUnique({
      where: { id: labIntegrationId },
      select: {
        id: true,
        healthcare_platform_organization_id: true,
        lab_vendor_code: true,
        connection_uri: true,
        supported_message_format: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) {
    throw new Error("Lab integration not found");
  }
  return {
    id: record.id,
    healthcare_platform_organization_id:
      record.healthcare_platform_organization_id,
    lab_vendor_code: record.lab_vendor_code,
    connection_uri: record.connection_uri,
    supported_message_format: record.supported_message_format,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
