import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IPageIRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingShoppingListItem";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

export async function getrecipeSharingRegularUserShoppingListsShoppingListIdShoppingListItems(props: {
  regularUser: RegularuserPayload;
  shoppingListId: string & tags.Format<"uuid">;
}): Promise<IPageIRecipeSharingShoppingListItem.ISummary> {
  const { regularUser, shoppingListId } = props;

  // Verify shopping list ownership
  const shoppingList =
    await MyGlobal.prisma.recipe_sharing_shopping_lists.findUnique({
      where: {
        id: shoppingListId,
      },
      select: {
        owner_user_id: true,
      },
    });

  if (!shoppingList || shoppingList.owner_user_id !== regularUser.id) {
    throw new Error("Unauthorized or shopping list not found");
  }

  // Retrieve all shopping list items for the given shopping list
  const items =
    await MyGlobal.prisma.recipe_sharing_shopping_list_items.findMany({
      where: {
        shopping_list_id: shoppingListId,
      },
      select: {
        id: true,
        ingredient_id: true,
        quantity: true,
        unit: true,
        notes: true,
      },
      orderBy: { created_at: "asc" },
    });

  return {
    pagination: {
      current: 1,
      limit: Number(items.length),
      records: Number(items.length),
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
