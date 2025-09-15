import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing device data ingestion configuration by ID in
 * healthcare_platform_device_data_ingestions.
 *
 * This endpoint allows a system administrator to modify the connectivity and
 * integration properties of a medical device ingestion record, such as device
 * type, endpoint URI, supported protocol, operational status, and soft-delete
 * state. The update is only permitted for active (not deleted) records and will
 * update the internal updated_at timestamp for auditing. Errors are thrown if
 * the record does not exist, has been previously deleted, or if a constraint
 * violation occurs.
 *
 * @param props - The operation parameters
 * @param props.systemAdmin - The authenticated system administrator
 * @param props.deviceDataIngestionId - UUID of the ingestion record to update
 * @param props.body - Properties to update (PATCH semantics; any subset of
 *   allowed mutable fields)
 * @returns The updated device data ingestion configuration, with all fields
 *   populated and all timestamps as ISO strings.
 * @throws {Error} When the device data ingestion record does not exist or is
 *   already deleted
 * @throws {Error} On constraint violation or database failure
 */
export async function puthealthcarePlatformSystemAdminDeviceDataIngestionsDeviceDataIngestionId(props: {
  systemAdmin: SystemadminPayload;
  deviceDataIngestionId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDeviceDataIngestion.IUpdate;
}): Promise<IHealthcarePlatformDeviceDataIngestion> {
  const { deviceDataIngestionId, body } = props;
  // 1. Find active (not deleted) ingestion record by id
  const existing =
    await MyGlobal.prisma.healthcare_platform_device_data_ingestions.findFirst({
      where: {
        id: deviceDataIngestionId,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new Error(
      "Device data ingestion record not found or already deleted",
    );
  }

  // 2. Apply updates only for mutable fields; always update the updated_at timestamp
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_device_data_ingestions.update({
      where: { id: deviceDataIngestionId },
      data: {
        device_type: body.device_type ?? undefined,
        ingest_endpoint_uri: body.ingest_endpoint_uri ?? undefined,
        supported_protocol: body.supported_protocol ?? undefined,
        status: body.status ?? undefined,
        deleted_at: body.deleted_at ?? undefined,
        updated_at: now,
      },
    });

  // 3. Return updated record, formatted to API structure
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    device_type: updated.device_type,
    ingest_endpoint_uri: updated.ingest_endpoint_uri,
    supported_protocol: updated.supported_protocol,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
