import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemConfiguration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing system configuration setting.
 *
 * This endpoint updates the "value" and "description" properties of the system
 * configuration identified by the provided ID. The "key" field remains
 * unchanged. The "updated_at" timestamp is refreshed to the current time.
 *
 * Authorization is required with the systemAdmin role.
 *
 * @param props - Request properties containing systemAdmin, the target ID, and
 *   body for update
 * @param props.systemAdmin - The authenticated system admin performing the
 *   update
 * @param props.id - UUID of the system configuration to update
 * @param props.body - Partial update data for the system configuration
 * @returns The updated system configuration record with all fields including
 *   timestamps
 * @throws {Error} Throws if the system configuration with the given ID does not
 *   exist
 */
export async function putenterpriseLmsSystemAdminSystemConfigurationsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsSystemConfiguration.IUpdate;
}): Promise<IEnterpriseLmsSystemConfiguration> {
  const { systemAdmin, id, body } = props;

  // Fetch the existing record or throw if not found
  const existing =
    await MyGlobal.prisma.enterprise_lms_system_configurations.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Current time in ISO format
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Update record with provided value and description
  const updated =
    await MyGlobal.prisma.enterprise_lms_system_configurations.update({
      where: { id },
      data: {
        value: body.value ?? undefined,
        description: body.description ?? undefined,
        updated_at: now,
      },
    });

  // Return updated record with correct date-time formats
  return {
    id: updated.id as string & tags.Format<"uuid">,
    key: updated.key,
    value: updated.value,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
