import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Create a new ingredient record in the master ingredient table.
 *
 * Requires authorized regular user role to perform ingredient management.
 *
 * @param props - Object containing the authenticated user and ingredient
 *   creation data
 * @param props.regularUser - The authenticated regular user performing the
 *   creation
 * @param props.body - The ingredient creation data including name and optional
 *   brand
 * @returns The fully detailed created ingredient including UUID and timestamps
 * @throws {Error} When database constraints (e.g., unique name) are violated or
 *   on other failures
 */
export async function postrecipeSharingRegularUserIngredients(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingIngredient.ICreate;
}): Promise<IRecipeSharingIngredient> {
  const { body } = props;

  const created = await MyGlobal.prisma.recipe_sharing_ingredients.create({
    data: {
      id: v4(),
      name: body.name,
      brand: body.brand ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    name: created.name,
    brand: created.brand ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
