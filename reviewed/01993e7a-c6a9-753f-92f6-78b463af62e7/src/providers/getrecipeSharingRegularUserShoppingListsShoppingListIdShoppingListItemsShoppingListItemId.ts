import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingListItem";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve a specific shopping list item identified by shoppingListItemId
 * within a shopping list identified by shoppingListId. Access is restricted to
 * the owner of the shopping list (regularUser). Returns detailed information
 * about the item including ingredient reference, quantity, unit, notes, and
 * timestamps.
 *
 * @param props - Object containing the regularUser auth payload,
 *   shoppingListId, and shoppingListItemId
 * @returns The shopping list item matching the ids, if authorized
 * @throws {Error} If the item does not exist or user is unauthorized
 */
export async function getrecipeSharingRegularUserShoppingListsShoppingListIdShoppingListItemsShoppingListItemId(props: {
  regularUser: RegularuserPayload;
  shoppingListId: string & tags.Format<"uuid">;
  shoppingListItemId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingShoppingListItem> {
  const item =
    await MyGlobal.prisma.recipe_sharing_shopping_list_items.findFirst({
      where: {
        id: props.shoppingListItemId,
        shopping_list_id: props.shoppingListId,
        shoppingList: {
          is: {
            ownerUserId: props.regularUser.id,
          },
        },
      },
    });

  if (!item) {
    throw new Error("Shopping list item not found or unauthorized");
  }

  return {
    id: item.id,
    shopping_list_id: item.shopping_list_id,
    ingredient_id: item.ingredient_id,
    quantity: item.quantity,
    unit: item.unit,
    notes: item.notes ?? null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  };
}
