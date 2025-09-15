import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific device data ingestion configuration by ID from
 * healthcare_platform_device_data_ingestions table.
 *
 * This operation fetches the full details for a device data ingestion
 * configuration, including endpoint, device type, protocol, operational status,
 * and timestamps. It is restricted to authenticated system administrators and
 * is critical for compliance, audit, integration monitoring, and
 * troubleshooting workflows.
 *
 * Security: Only system administrators (SystemadminPayload) may invoke this
 * operation. Returns all metadata for compliance and technical use. Throws
 * Error if the record does not exist or is soft-deleted.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - JWT-authenticated SystemadminPayload (must be
 *   valid system admin)
 * @param props.deviceDataIngestionId - UUID (string & tags.Format<'uuid'>) of
 *   the device data ingestion configuration to retrieve
 * @returns Full details for the device data ingestion configuration as
 *   IHealthcarePlatformDeviceDataIngestion
 * @throws {Error} When the specified device data ingestion configuration does
 *   not exist or is soft deleted
 */
export async function gethealthcarePlatformSystemAdminDeviceDataIngestionsDeviceDataIngestionId(props: {
  systemAdmin: SystemadminPayload;
  deviceDataIngestionId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformDeviceDataIngestion> {
  const { deviceDataIngestionId } = props;
  // Authorization is guaranteed by decorator; can extend logic if needed
  const ingestion =
    await MyGlobal.prisma.healthcare_platform_device_data_ingestions.findFirst({
      where: { id: deviceDataIngestionId, deleted_at: null },
    });
  if (!ingestion) {
    throw new Error("Device data ingestion configuration not found");
  }
  return {
    id: ingestion.id,
    healthcare_platform_organization_id:
      ingestion.healthcare_platform_organization_id,
    device_type: ingestion.device_type,
    ingest_endpoint_uri: ingestion.ingest_endpoint_uri,
    supported_protocol: ingestion.supported_protocol,
    status: ingestion.status,
    created_at: toISOStringSafe(ingestion.created_at),
    updated_at: toISOStringSafe(ingestion.updated_at),
    deleted_at: ingestion.deleted_at
      ? toISOStringSafe(ingestion.deleted_at)
      : undefined,
  };
}
