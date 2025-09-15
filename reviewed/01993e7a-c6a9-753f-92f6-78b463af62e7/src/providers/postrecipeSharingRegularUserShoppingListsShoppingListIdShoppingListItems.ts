import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingListItem";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Create a new shopping list item under a specific shopping list.
 *
 * This function verifies user ownership of the shopping list, validates the
 * existence of the specified ingredient, and then inserts a new item with the
 * provided details.
 *
 * All DateTime fields are handled as ISO 8601 strings with tags, and all UUIDs
 * are generated or verified with branding.
 *
 * @param props - The operation parameters including the authenticated user, the
 *   target shopping list ID, and the shopping list item creation body.
 * @param props.regularUser - The authenticated regular user.
 * @param props.shoppingListId - UUID of the shopping list to add item to.
 * @param props.body - The create input for the shopping list item including
 *   ingredient and quantity details.
 * @returns The newly created shopping list item with timestamps.
 * @throws {Error} When the shopping list does not belong to the user.
 * @throws {Error} When the target shopping list does not exist.
 * @throws {Error} When the ingredient does not exist.
 */
export async function postrecipeSharingRegularUserShoppingListsShoppingListItems(props: {
  regularUser: RegularuserPayload;
  shoppingListId: string & tags.Format<"uuid">;
  body: IRecipeSharingShoppingListItem.ICreate;
}): Promise<IRecipeSharingShoppingListItem> {
  const { regularUser, shoppingListId, body } = props;

  // Verify if shopping list exists and belongs to user
  const shoppingList =
    await MyGlobal.prisma.recipe_sharing_shopping_lists.findUniqueOrThrow({
      where: { id: shoppingListId },
    });
  if (shoppingList.user_id !== regularUser.id) {
    throw new Error("Unauthorized: You do not own this shopping list.");
  }

  // Verify ingredient existence
  await MyGlobal.prisma.recipe_sharing_ingredients.findUniqueOrThrow({
    where: { id: body.ingredient_id },
  });

  const now = toISOStringSafe(new Date());

  // Create new shopping list item
  const created =
    await MyGlobal.prisma.recipe_sharing_shopping_list_items.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_list_id: shoppingListId,
        ingredient_id: body.ingredient_id,
        quantity: body.quantity,
        unit: body.unit,
        notes: body.notes ?? null,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_list_id: created.shopping_list_id as string & tags.Format<"uuid">,
    ingredient_id: created.ingredient_id as string & tags.Format<"uuid">,
    quantity: created.quantity,
    unit: created.unit,
    notes: created.notes ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
