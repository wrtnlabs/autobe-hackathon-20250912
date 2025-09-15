import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingSystemConfig";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Create new system configuration entry
 *
 * Adds a new system configuration setting with a unique key and associated
 * value. Optional description can provide context. The timestamps for creation
 * and update are handled automatically.
 *
 * This operation requires moderator authorization to restrict configuration
 * changes to trusted users only.
 *
 * @param props - Object containing moderator credentials and system
 *   configuration data
 * @param props.moderator - The authenticated moderator user
 * @param props.body - The system configuration creation request data
 * @returns The newly created system configuration entry with timestamps
 * @throws {Error} When Prisma operation fails or uniqueness constraint violated
 */
export async function postrecipeSharingModeratorSystemConfig(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingSystemConfig.ICreate;
}): Promise<IRecipeSharingSystemConfig> {
  const { moderator, body } = props;

  const created = await MyGlobal.prisma.recipe_sharing_system_config.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      key: body.key,
      value: body.value,
      description: body.description ?? null,
    },
  });

  return {
    id: created.id,
    key: created.key,
    value: created.value,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
