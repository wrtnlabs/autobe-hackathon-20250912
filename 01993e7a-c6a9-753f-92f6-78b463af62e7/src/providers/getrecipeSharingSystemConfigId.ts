import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingSystemConfig";

/**
 * Get system configuration entry by ID
 *
 * Retrieves detailed data for a given system configuration by its unique ID.
 * Returns all configuration fields including key, value, optional description,
 * and timestamps for creation and last update.
 *
 * This is a public endpoint requiring no authentication.
 *
 * @param props - Object containing the system configuration ID.
 * @param props.id - UUID of the system configuration to retrieve.
 * @returns Detailed system configuration object matching
 *   IRecipeSharingSystemConfig.
 * @throws {Error} Throws if no system configuration with the provided ID is
 *   found.
 */
export async function getrecipeSharingSystemConfigId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingSystemConfig> {
  const { id } = props;
  const record =
    await MyGlobal.prisma.recipe_sharing_system_config.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    key: record.key,
    value: record.value,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
