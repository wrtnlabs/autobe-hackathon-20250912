import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Deletes a system configuration permanently by its unique ID.
 *
 * This operation performs a hard delete on the
 * enterprise_lms_system_configurations table. It requires a valid systemAdmin
 * authentication and the ID of the configuration to delete.
 *
 * @param props - Object containing systemAdmin payload and configuration ID
 * @param props.systemAdmin - Authenticated systemAdmin user performing the
 *   action
 * @param props.id - UUID of the system configuration to be deleted
 * @returns Promise<void> - Resolves upon successful deletion with no content
 * @throws {Error} If the system configuration with the specified ID does not
 *   exist
 */
export async function deleteenterpriseLmsSystemAdminSystemConfigurationsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, id } = props;

  // Verify the system configuration exists
  await MyGlobal.prisma.enterprise_lms_system_configurations.findUniqueOrThrow({
    where: { id },
  });

  // Perform hard delete since no soft delete support
  await MyGlobal.prisma.enterprise_lms_system_configurations.delete({
    where: { id },
  });
}
