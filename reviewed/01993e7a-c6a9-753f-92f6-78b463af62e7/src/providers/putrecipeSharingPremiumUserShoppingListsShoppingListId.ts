import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Update an existing shopping list for the authenticated premium user.
 *
 * This operation ensures only the owner of the shopping list can update it.
 * Supports updating optional fields like name and soft-deletion timestamp.
 * Automatically updates the updated_at timestamp.
 *
 * @param props - Object containing premiumUser payload, shoppingListId, and
 *   update body
 * @returns The updated shopping list entity conforming to
 *   IRecipeSharingShoppingList
 * @throws {Error} When the shopping list does not exist
 * @throws {Error} When the authenticated user does not own the shopping list
 */
export async function putrecipeSharingPremiumUserShoppingListsShoppingListId(props: {
  premiumUser: PremiumuserPayload;
  shoppingListId: string;
  body: IRecipeSharingShoppingList.IUpdate;
}): Promise<IRecipeSharingShoppingList> {
  const { premiumUser, shoppingListId, body } = props;

  // Fetch the existing shopping list and verify ownership
  const existing =
    await MyGlobal.prisma.recipe_sharing_shopping_lists.findUnique({
      where: { id: shoppingListId },
    });
  if (existing === null) throw new Error("Shopping list not found");
  if (existing.user_id !== premiumUser.id) throw new Error("Unauthorized");

  // Prepare updated_at timestamp
  const updatedAt = toISOStringSafe(new Date());

  // Update the shopping list
  const updated = await MyGlobal.prisma.recipe_sharing_shopping_lists.update({
    where: { id: shoppingListId },
    data: {
      name: body.name ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: updatedAt,
    },
  });

  // Return updated shopping list with all date fields formatted
  return {
    id: updated.id,
    user_id: updated.user_id,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updatedAt,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
