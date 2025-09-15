import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IPageIRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingShoppingListItem";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Lists all items in a shopping list for the authorized premium user.
 *
 * This function verifies that the specified shopping list is owned by the
 * premium user and then retrieves all items contained in that shopping list.
 *
 * @param props - Object containing premiumUser payload and shoppingListId
 * @param props.premiumUser - The authorized premium user information
 * @param props.shoppingListId - The UUID of the shopping list to retrieve items
 *   from
 * @returns A paginated summary of shopping list items matching
 *   IPageIRecipeSharingShoppingListItem.ISummary
 * @throws {Error} Throws error if shopping list is not owned by the premium
 *   user or does not exist
 */
export async function getrecipeSharingPremiumUserShoppingListsShoppingListIdShoppingListItems(props: {
  premiumUser: PremiumuserPayload;
  shoppingListId: string;
}): Promise<IPageIRecipeSharingShoppingListItem.ISummary> {
  const { premiumUser, shoppingListId } = props;

  const shoppingList =
    await MyGlobal.prisma.recipe_sharing_shopping_lists.findFirst({
      where: {
        id: shoppingListId,
        owner_user_id: premiumUser.id,
      },
      select: {
        id: true,
      },
    });

  if (!shoppingList) {
    throw new Error("Unauthorized: Shopping list not found or access denied");
  }

  const items =
    await MyGlobal.prisma.recipe_sharing_shopping_list_items.findMany({
      where: { shopping_list_id: shoppingListId },
      select: {
        id: true,
        ingredient_id: true,
        quantity: true,
        unit: true,
        notes: true,
        created_at: true,
        updated_at: true,
      },
    });

  const recordsTotal = items.length;

  return {
    pagination: {
      current: 1,
      limit: recordsTotal,
      records: recordsTotal,
      pages: 1,
    },
    data: items.map((item) => ({
      id: item.id,
      ingredient_id: item.ingredient_id,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes ?? undefined,
    })),
  };
}
