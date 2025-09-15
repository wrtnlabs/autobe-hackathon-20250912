import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete a configuration record by UUID, using the deleted_at field for
 * compliance.
 *
 * This operation performs a soft deletion of an existing configuration record
 * in the healthcare_platform_configuration table by setting the deleted_at
 * timestamp and updates updated_at. The record is not physically removed,
 * ensuring auditability and compliance per regulatory requirements. This can
 * only be performed by active system administrators. If the configuration does
 * not exist or is already deleted, the operation will throw an error. No other
 * fields are modified.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - Authenticated system admin performing the action
 * @param props.configurationId - UUID of the configuration to soft-delete
 * @returns Void
 * @throws {Error} If the configuration is not found or already deleted
 */
export async function deletehealthcarePlatformSystemAdminConfigurationConfigurationId(props: {
  systemAdmin: SystemadminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { configurationId } = props;

  // Fetch configuration by ID and deleted_at null (active)
  const config =
    await MyGlobal.prisma.healthcare_platform_configuration.findFirst({
      where: {
        id: configurationId,
        deleted_at: null,
      },
    });
  if (!config) {
    throw new Error("Configuration not found or already deleted");
  }

  // Set deletion and update timestamps (ISO8601, branded)
  const timestamp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.healthcare_platform_configuration.update({
    where: { id: configurationId },
    data: {
      deleted_at: timestamp,
      updated_at: timestamp,
    },
  });
  return;
}
