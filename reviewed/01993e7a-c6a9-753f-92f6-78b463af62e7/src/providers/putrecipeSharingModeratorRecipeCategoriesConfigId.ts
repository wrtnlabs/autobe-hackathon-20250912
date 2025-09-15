import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecipeCategoriesConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategoriesConfig";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update a specific recipe category configuration by ID
 *
 * This operation modifies a recipe category config identified by its unique ID.
 * It enables updating the 'code' which is a unique identifier for the category,
 * the human-readable 'name', and an optional 'description'. The update affects
 * the timestamps to reflect the modification instant.
 *
 * Authorization is required for users with the 'moderator' role.
 *
 * @param props - Object containing moderator authentication payload, category
 *   config ID, and update data
 * @param props.moderator - The authenticated moderator performing the update
 * @param props.id - UUID of the recipe category configuration to update
 * @param props.body - Data to update the recipe category configuration
 * @returns The updated recipe category configuration details
 * @throws {Error} Throws if the category configuration with the given ID does
 *   not exist
 */
export async function putrecipeSharingModeratorRecipeCategoriesConfigId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingRecipeCategoriesConfig.IUpdate;
}): Promise<IRecipeSharingRecipeCategoriesConfig> {
  const { moderator, id, body } = props;

  // Verify the category config exists
  const existingConfig =
    await MyGlobal.prisma.recipe_sharing_recipe_categories_config.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Prepare updated_at timestamp
  const now = toISOStringSafe(new Date());

  // Update the record
  const updated =
    await MyGlobal.prisma.recipe_sharing_recipe_categories_config.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        updated_at: now,
      },
    });

  // Return updated data with created_at from original record
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(existingConfig.created_at),
    updated_at: now,
  };
}
