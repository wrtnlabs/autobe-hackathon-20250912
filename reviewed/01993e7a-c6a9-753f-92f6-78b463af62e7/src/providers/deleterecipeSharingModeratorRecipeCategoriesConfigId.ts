import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Delete a specific recipe category configuration by ID.
 *
 * This operation permanently removes a recipe category configuration from the
 * system database. It ensures that the target configuration exists before
 * deletion and requires authorization by a moderator.
 *
 * @param props - Object containing the moderator payload and the ID of the
 *   category config to delete
 * @param props.moderator - Moderator payload verifying authorization
 * @param props.id - UUID of the recipe category configuration to delete
 * @throws {Error} Throws if the category configuration with the specified ID
 *   does not exist
 */
export async function deleterecipeSharingModeratorRecipeCategoriesConfigId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, id } = props;

  // Confirm existence; throws if not found
  await MyGlobal.prisma.recipe_sharing_recipe_categories_config.findUniqueOrThrow(
    {
      where: { id },
    },
  );

  // Proceed to hard delete
  await MyGlobal.prisma.recipe_sharing_recipe_categories_config.delete({
    where: { id },
  });
}
