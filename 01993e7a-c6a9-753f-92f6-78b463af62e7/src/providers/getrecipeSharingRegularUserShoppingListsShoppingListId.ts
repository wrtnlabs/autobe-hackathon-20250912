import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve details of a specific shopping list.
 *
 * This function fetches a shopping list owned by the authenticated regular user
 * identified by the shoppingListId. It includes all metadata and associated
 * shopping list items.
 *
 * Authorization ensures only the owner can access their shopping list.
 *
 * @param props - Object containing the authenticated user and shopping list ID
 * @param props.regularUser - Authenticated regular user payload with ID
 * @param props.shoppingListId - UUID of the shopping list to retrieve
 * @returns Detailed shopping list information including individual items
 * @throws {Error} If the shopping list does not exist or unauthorized access
 */
export async function getrecipeSharingRegularUserShoppingListsShoppingListId(props: {
  regularUser: RegularuserPayload;
  shoppingListId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingShoppingList> {
  const { regularUser, shoppingListId } = props;

  const shoppingList =
    await MyGlobal.prisma.recipe_sharing_shopping_lists.findFirst({
      where: {
        id: shoppingListId,
        user_id: regularUser.id,
        deleted_at: null,
      },
      include: {
        recipe_sharing_shopping_list_items: true,
      },
    });

  if (!shoppingList) throw new Error("Shopping list not found or unauthorized");

  return {
    id: shoppingList.id,
    user_id: shoppingList.user_id,
    name: shoppingList.name,
    created_at: toISOStringSafe(shoppingList.created_at),
    updated_at: toISOStringSafe(shoppingList.updated_at),
    deleted_at: shoppingList.deleted_at
      ? toISOStringSafe(shoppingList.deleted_at)
      : null,
    // Map items from shopping_list_items relation
    items: shoppingList.recipe_sharing_shopping_list_items.map((item) => ({
      id: item.id,
      shopping_list_id: item.shopping_list_id,
      ingredient_id: item.ingredient_id,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes ?? undefined,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
