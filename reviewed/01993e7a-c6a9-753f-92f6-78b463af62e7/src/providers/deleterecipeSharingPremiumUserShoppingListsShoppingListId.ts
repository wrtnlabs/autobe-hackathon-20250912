import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Permanently delete a shopping list owned by the authenticated premium user.
 *
 * This operation verifies the ownership of the shopping list to ensure only the
 * owner can delete it. It performs a hard delete removing the record entirely
 * from the database.
 *
 * @param props - Object containing the premium user payload and the shopping
 *   list ID.
 * @param props.premiumUser - Authenticated premium user performing the
 *   deletion.
 * @param props.shoppingListId - UUID of the shopping list to be deleted.
 * @returns Void
 * @throws {Error} If the shopping list does not exist or does not belong to the
 *   premium user.
 */
export async function deleterecipeSharingPremiumUserShoppingListsShoppingListId(props: {
  premiumUser: PremiumuserPayload;
  shoppingListId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { premiumUser, shoppingListId } = props;

  // Verify ownership of the shopping list
  const shoppingList =
    await MyGlobal.prisma.recipe_sharing_shopping_lists.findFirstOrThrow({
      where: {
        id: shoppingListId,
        user_id: premiumUser.id,
      },
      select: {
        id: true,
        user_id: true,
      },
    });

  // Perform hard delete
  await MyGlobal.prisma.recipe_sharing_shopping_lists.delete({
    where: {
      id: shoppingList.id,
    },
  });
}
