import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Update details of an ingredient in the recipe_sharing_ingredients table.
 *
 * This endpoint allows an authenticated premium user to update the ingredient's
 * name and optionally brand by specifying the ingredientId path parameter. It
 * maintains audit timestamps and ensures data consistency.
 *
 * @param props - Object containing the authenticated premium user,
 *   ingredientId, and update body with optional name and brand.
 * @returns The updated ingredient record with all fields.
 * @throws {Error} Throws if the ingredient with the given ID does not exist.
 */
export async function putrecipeSharingPremiumUserIngredientsIngredientId(props: {
  premiumUser: PremiumuserPayload;
  ingredientId: string & tags.Format<"uuid">;
  body: IRecipeSharingIngredient.IUpdate;
}): Promise<IRecipeSharingIngredient> {
  const { premiumUser, ingredientId, body } = props;
  const now = toISOStringSafe(new Date());

  const updateData: {
    name?: string | undefined;
    brand?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: now,
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.brand !== undefined) updateData.brand = body.brand;

  const updated = await MyGlobal.prisma.recipe_sharing_ingredients.update({
    where: { id: ingredientId },
    data: updateData,
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    name: updated.name,
    brand: updated.brand === null ? null : (updated.brand ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
