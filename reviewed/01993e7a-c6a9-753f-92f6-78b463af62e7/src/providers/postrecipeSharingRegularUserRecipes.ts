import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Create a new recipe entry in the system.
 *
 * This operation creates a recipe record associated with the authenticated
 * regular user. It sets timestamps and UUIDs appropriately, ensuring that the
 * recipe title is unique per user as enforced by the database.
 *
 * @param props - Object containing the authenticated regular user and recipe
 *   creation details.
 * @param props.regularUser - The authenticated regular user performing the
 *   creation.
 * @param props.body - The recipe creation data including title, optional
 *   description, and status.
 * @returns The newly created recipe with all fields including timestamps and
 *   ID.
 * @throws {Error} Throws if database operation fails or constraints are
 *   violated.
 */
export async function postrecipeSharingRegularUserRecipes(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingRecipes.ICreate;
}): Promise<IRecipeSharingRecipes> {
  const { regularUser, body } = props;
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.recipe_sharing_recipes.create({
    data: {
      id,
      created_by_id: regularUser.id,
      title: body.title,
      description: body.description ?? undefined,
      status: body.status,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    created_by_id: created.created_by_id,
    title: created.title,
    description: created.description ?? null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
