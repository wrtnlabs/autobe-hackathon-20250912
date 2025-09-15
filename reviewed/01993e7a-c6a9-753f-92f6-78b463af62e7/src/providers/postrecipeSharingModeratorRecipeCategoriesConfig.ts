import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecipeCategoriesConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategoriesConfig";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Create a new recipe category configuration.
 *
 * This endpoint allows moderators to create a recipe category configuration
 * with a unique code and name, and an optional description. Timestamps are set
 * automatically.
 *
 * @param props - The request properties.
 * @param props.moderator - The authenticated moderator creating the category.
 * @param props.body - The recipe category configuration creation data.
 * @returns The newly created recipe category configuration record.
 * @throws {Error} Throws an error if the creation fails or database issues
 *   occur.
 */
export async function postrecipeSharingModeratorRecipeCategoriesConfig(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingRecipeCategoriesConfig.ICreate;
}): Promise<IRecipeSharingRecipeCategoriesConfig> {
  const { body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.recipe_sharing_recipe_categories_config.create({
      data: {
        id,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
