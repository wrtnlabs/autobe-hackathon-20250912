import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecipeCategoriesConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategoriesConfig";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Get recipe category configuration by ID
 *
 * Retrieve a single recipe category configuration's detailed information by its
 * UUID identifier from the recipe_sharing_recipe_categories_config table.
 *
 * Only accessible to authenticated moderators.
 *
 * @param props - Object containing moderator payload and the recipe category
 *   config ID
 * @param props.moderator - Authenticated moderator making the request
 * @param props.id - UUID of the recipe category configuration to retrieve
 * @returns Recipe category configuration details
 * @throws {Error} When the specified record is not found
 */
export async function getrecipeSharingModeratorRecipeCategoriesConfigId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingRecipeCategoriesConfig> {
  const record =
    await MyGlobal.prisma.recipe_sharing_recipe_categories_config.findUniqueOrThrow(
      {
        where: { id: props.id },
      },
    );

  return {
    id: record.id as string & tags.Format<"uuid">,
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
