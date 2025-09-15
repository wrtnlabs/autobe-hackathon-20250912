import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSystemConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemConfigurations";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get system configuration details by ID
 *
 * This function retrieves comprehensive details of a system-wide configuration
 * setting identified by its unique ID. Access to this operation is restricted
 * to authenticated system administrators only, enforcing strict security.
 *
 * @param props - Object containing the authenticated systemAdmin payload and
 *   the unique identifier of the system configuration to retrieve.
 * @param props.systemAdmin - The authenticated system admin executing the
 *   request.
 * @param props.id - UUID of the specific system configuration
 * @returns The detailed system configuration record including key, value,
 *   optional description, and audit timestamps.
 * @throws {Error} Throws an error if no configuration is found with the given
 *   ID, resulting in a 404 Not Found scenario.
 */
export async function getenterpriseLmsSystemAdminSystemConfigurationsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsSystemConfigurations> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_system_configurations.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  return {
    id: record.id,
    key: record.key,
    value: record.value,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
