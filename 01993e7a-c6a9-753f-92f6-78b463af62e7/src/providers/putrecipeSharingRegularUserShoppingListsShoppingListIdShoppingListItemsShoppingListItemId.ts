import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingListItem";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update a shopping list item identified by shoppingListItemId within the
 * specified shopping list.
 *
 * Validates ownership by the authenticated regular user and ensures the item
 * belongs to the shopping list. Updates only the provided fields and returns
 * the updated shopping list item entity.
 *
 * @param props - The operation parameters and authenticated user info
 * @param props.regularUser - Authenticated regular user payload
 * @param props.shoppingListId - Identifier of the shopping list containing the
 *   item
 * @param props.shoppingListItemId - Identifier of the shopping list item to
 *   update
 * @param props.body - Fields to update on the shopping list item
 * @returns The updated shopping list item with audit timestamps
 * @throws {Error} When the shopping list item is not found or unauthorized
 */
export async function putrecipeSharingRegularUserShoppingListsShoppingListIdShoppingListItemsShoppingListItemId(props: {
  regularUser: RegularuserPayload;
  shoppingListId: string & tags.Format<"uuid">;
  shoppingListItemId: string & tags.Format<"uuid">;
  body: IRecipeSharingShoppingListItem.IUpdate;
}): Promise<IRecipeSharingShoppingListItem> {
  const { regularUser, shoppingListId, shoppingListItemId, body } = props;

  // Verify ownership: Find the shopping list item with matching ID and shopping list ID
  const existingItem =
    await MyGlobal.prisma.recipe_sharing_shopping_list_items.findFirst({
      where: {
        id: shoppingListItemId,
        shopping_list_id: shoppingListId,
      },
      select: {
        id: true,
        shopping_list_id: true,
        ingredient_id: true,
        quantity: true,
        unit: true,
        notes: true,
        created_at: true,
        updated_at: true,
      },
    });

  if (!existingItem) {
    throw new Error("Shopping list item not found or unauthorized");
  }

  // Update the shopping list item with provided fields
  const updated =
    await MyGlobal.prisma.recipe_sharing_shopping_list_items.update({
      where: { id: shoppingListItemId },
      data: {
        ...(body.shopping_list_id !== undefined && {
          shopping_list_id: body.shopping_list_id,
        }),
        ...(body.ingredient_id !== undefined && {
          ingredient_id: body.ingredient_id,
        }),
        ...(body.quantity !== undefined && { quantity: body.quantity }),
        ...(body.unit !== undefined && { unit: body.unit }),
        notes: body.notes === undefined ? existingItem.notes : body.notes,
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        shopping_list_id: true,
        ingredient_id: true,
        quantity: true,
        unit: true,
        notes: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    shopping_list_id: updated.shopping_list_id as string & tags.Format<"uuid">,
    ingredient_id: updated.ingredient_id as string & tags.Format<"uuid">,
    quantity: updated.quantity,
    unit: updated.unit,
    notes: updated.notes ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
