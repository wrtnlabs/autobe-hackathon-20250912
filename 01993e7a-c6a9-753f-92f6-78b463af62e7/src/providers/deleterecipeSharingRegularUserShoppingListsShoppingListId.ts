import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Delete a shopping list permanently by ID, owned by the authenticated regular
 * user.
 *
 * This operation performs a hard delete removing the record from the database.
 * It verifies ownership before deletion, throwing errors if the list does not
 * exist or if the user is unauthorized.
 *
 * @param props - Object containing regularUser data and shoppingListId
 * @param props.regularUser - Authenticated regular user payload with id and
 *   type
 * @param props.shoppingListId - UUID of the shopping list to delete
 * @throws {Error} When shopping list is not found
 * @throws {Error} When user does not own the shopping list
 */
export async function deleterecipeSharingRegularUserShoppingListsShoppingListId(props: {
  regularUser: {
    id: string & tags.Format<"uuid">;
    type: string;
  };
  shoppingListId: string;
}): Promise<void> {
  const { regularUser, shoppingListId } = props;

  // Find the shopping list record by ID
  const shoppingList =
    await MyGlobal.prisma.recipe_sharing_shopping_lists.findUnique({
      where: { id: shoppingListId },
      select: { id: true, user_id: true },
    });

  if (!shoppingList) {
    throw new Error("Shopping list not found");
  }

  // Check ownership
  if (shoppingList.user_id !== regularUser.id) {
    throw new Error("Unauthorized: You do not own this shopping list");
  }

  // Hard delete the shopping list
  await MyGlobal.prisma.recipe_sharing_shopping_lists.delete({
    where: { id: shoppingListId },
  });
}
