import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingDietCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDietCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Creates a new diet category in the system to classify recipes and user
 * dietary preferences.
 *
 * This operation requires supplying a unique code and name for the diet
 * category, with an optional description for clarity.
 *
 * It uses the 'recipe_sharing_diet_categories' table.
 *
 * @param props - An object containing moderator authentication info and the
 *   category data to create.
 * @param props.moderator - Authenticated moderator performing the operation.
 * @param props.body - Object containing the diet category creation info.
 * @returns The newly created diet category with audit timestamps.
 * @throws {Error} If uniqueness constraints on code or other database errors
 *   occur.
 */
export async function postrecipeSharingModeratorDietCategories(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingDietCategory.ICreate;
}): Promise<IRecipeSharingDietCategory> {
  const { body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.recipe_sharing_diet_categories.create({
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
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
