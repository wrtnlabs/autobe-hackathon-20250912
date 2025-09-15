import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

export async function deleterecipeSharingRegularUserShoppingListsShoppingListIdShoppingListItemsShoppingListItemId(props: {
  regularUser: RegularuserPayload;
  shoppingListId: string & tags.Format<"uuid">;
  shoppingListItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, shoppingListId, shoppingListItemId } = props;

  // Verify ownership and list existence
  const shoppingList =
    await MyGlobal.prisma.recipe_sharing_shopping_lists.findFirst({
      where: {
        id: shoppingListId,
        owner_user_id: regularUser.id,
        deleted_at: null,
      },
    });

  if (!shoppingList) throw new Error("Unauthorized or shopping list not found");

  // Hard delete the shopping list item identified by shoppingListItemId
  await MyGlobal.prisma.recipe_sharing_shopping_list_items.delete({
    where: { id: shoppingListItemId },
  });
}
