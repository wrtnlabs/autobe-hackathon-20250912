import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingListItem";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Retrieve a specific shopping list item by its unique identifier within the
 * specified shopping list.
 *
 * This function checks that the requesting premium user owns the shopping list
 * and fetches the detailed shopping list item data including ingredient
 * reference, quantity, unit, notes, and timestamps.
 *
 * @param props - The properties containing premium user payload and IDs.
 * @param props.premiumUser - The authenticated premium user payload.
 * @param props.shoppingListId - The UUID of the shopping list containing the
 *   item.
 * @param props.shoppingListItemId - The UUID of the shopping list item to
 *   retrieve.
 * @returns The detailed shopping list item data conforming to
 *   IRecipeSharingShoppingListItem.
 * @throws {Error} When the shopping list is not found or does not belong to the
 *   premium user.
 * @throws {Error} When the shopping list item does not exist within the
 *   shopping list.
 */
export async function getrecipeSharingPremiumUserShoppingListsShoppingListIdShoppingListItemsShoppingListItemId(props: {
  premiumUser: PremiumuserPayload;
  shoppingListId: string;
  shoppingListItemId: string;
}): Promise<IRecipeSharingShoppingListItem> {
  const { premiumUser, shoppingListId, shoppingListItemId } = props;

  // Verify the shopping list belongs to the premium user and is not deleted
  const shoppingList =
    await MyGlobal.prisma.recipe_sharing_shopping_lists.findFirst({
      where: {
        id: shoppingListId,
        owner_user_id: premiumUser.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!shoppingList) {
    throw new Error("Unauthorized or shopping list not found.");
  }

  // Retrieve the shopping list item ensuring it belongs to the specified list
  const item =
    await MyGlobal.prisma.recipe_sharing_shopping_list_items.findFirstOrThrow({
      where: {
        id: shoppingListItemId,
        shopping_list_id: shoppingListId,
      },
    });

  return {
    id: item.id as string & tags.Format<"uuid">,
    shopping_list_id: item.shopping_list_id as string & tags.Format<"uuid">,
    ingredient_id: item.ingredient_id as string & tags.Format<"uuid">,
    quantity: item.quantity,
    unit: item.unit,
    notes: item.notes ?? null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  };
}
