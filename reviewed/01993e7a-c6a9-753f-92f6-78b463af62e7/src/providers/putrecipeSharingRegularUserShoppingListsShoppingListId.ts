import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Updates an existing shopping list owned by the authenticated regular user.
 *
 * This operation verifies ownership and allows updating the shopping list's
 * name and soft deletion timestamp.
 *
 * @param props - Object containing authentication and update parameters
 * @param props.regularUser - Authenticated regular user payload
 * @param props.shoppingListId - The unique ID of the shopping list to update
 * @param props.body - Data for updating the shopping list
 * @returns The updated shopping list entity
 * @throws {Error} Throws error if the shopping list is not found or user is
 *   unauthorized
 */
export async function putrecipeSharingRegularUserShoppingListsShoppingListId(props: {
  regularUser: RegularuserPayload;
  shoppingListId: string;
  body: IRecipeSharingShoppingList.IUpdate;
}): Promise<IRecipeSharingShoppingList> {
  const { regularUser, shoppingListId, body } = props;

  // Fetch the shopping list by ID, or throw if it doesn't exist
  const shoppingList =
    await MyGlobal.prisma.recipe_sharing_shopping_lists.findUniqueOrThrow({
      where: { id: shoppingListId },
    });

  // Authorization check: only owner can update
  if (shoppingList.user_id !== regularUser.id) {
    throw new Error(
      "Unauthorized: You can only update your own shopping lists",
    );
  }

  // Prepare update data with proper null and undefined handling
  const dataToUpdate: IRecipeSharingShoppingList.IUpdate = {
    name: body.name ?? undefined,
    deleted_at: body.deleted_at ?? undefined,
  };

  // Execute the update operation
  const updated = await MyGlobal.prisma.recipe_sharing_shopping_lists.update({
    where: { id: shoppingListId },
    data: dataToUpdate,
  });

  // Return updated record with ISO string conversions
  return {
    id: updated.id as string & tags.Format<"uuid">,
    user_id: updated.user_id as string & tags.Format<"uuid">,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
