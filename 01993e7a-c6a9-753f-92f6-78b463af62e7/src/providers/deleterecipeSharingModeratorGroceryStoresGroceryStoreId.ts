import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Delete grocery store by its unique ID.
 *
 * This operation permanently deletes a grocery store record from the database.
 * It requires authorization as a moderator.
 *
 * @param props - The properties object containing moderator authentication and
 *   groceryStoreId.
 * @param props.moderator - Authenticated moderator performing the deletion.
 * @param props.groceryStoreId - UUID of the grocery store to delete.
 * @returns A promise that resolves when the deletion is complete.
 * @throws {Error} Throws if the grocery store does not exist.
 */
export async function deleterecipeSharingModeratorGroceryStoresGroceryStoreId(props: {
  moderator: ModeratorPayload;
  groceryStoreId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, groceryStoreId } = props;

  // Confirm grocery store existence or throw NotFound error
  await MyGlobal.prisma.recipe_sharing_grocery_stores.findUniqueOrThrow({
    where: { id: groceryStoreId },
  });

  // Perform hard delete
  await MyGlobal.prisma.recipe_sharing_grocery_stores.delete({
    where: { id: groceryStoreId },
  });
}
