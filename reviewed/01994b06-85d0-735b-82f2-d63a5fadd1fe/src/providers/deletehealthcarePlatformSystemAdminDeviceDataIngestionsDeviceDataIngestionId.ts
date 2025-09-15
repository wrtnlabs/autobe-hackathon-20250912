import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a device data ingestion configuration by its unique ID
 * (soft delete).
 *
 * This operation marks the device ingestion record as deleted by setting its
 * deleted_at field to the current time. Only system administrators may perform
 * this operation. Attempts to delete a non-existent or already-deleted record
 * will result in an error. The deletion is irreversible and reflects
 * immediately in all listings and access checks.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the deletion
 * @param props.deviceDataIngestionId - UUID of the device data ingestion
 *   configuration to delete
 * @returns Void
 * @throws {Error} When the configuration does not exist or is already deleted
 */
export async function deletehealthcarePlatformSystemAdminDeviceDataIngestionsDeviceDataIngestionId(props: {
  systemAdmin: SystemadminPayload;
  deviceDataIngestionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { deviceDataIngestionId } = props;
  // Verify the resource exists and is not already deleted
  const record =
    await MyGlobal.prisma.healthcare_platform_device_data_ingestions.findFirst({
      where: {
        id: deviceDataIngestionId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new Error(
      "Device data ingestion configuration not found or already deleted",
    );
  }
  // Soft-delete by setting deleted_at to now
  await MyGlobal.prisma.healthcare_platform_device_data_ingestions.update({
    where: { id: deviceDataIngestionId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
