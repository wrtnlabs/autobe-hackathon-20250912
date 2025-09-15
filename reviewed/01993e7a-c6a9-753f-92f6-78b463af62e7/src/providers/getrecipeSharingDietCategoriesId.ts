import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingDietCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDietCategories";

/**
 * Retrieve a single diet category by its unique identifier.
 *
 * This operation returns detailed information from the
 * 'recipe_sharing_diet_categories' table. It includes code, name, optional
 * description, and audit timestamps. No authentication is required as this is a
 * public endpoint.
 *
 * @param props - Object containing the required id parameter.
 * @param props.id - UUID of the diet category to retrieve.
 * @returns Detailed diet category information conforming to
 *   IRecipeSharingDietCategories.
 * @throws {Error} Throws if no diet category with the provided id exists.
 */
export async function getrecipeSharingDietCategoriesId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingDietCategories> {
  const { id } = props;
  const record =
    await MyGlobal.prisma.recipe_sharing_diet_categories.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
