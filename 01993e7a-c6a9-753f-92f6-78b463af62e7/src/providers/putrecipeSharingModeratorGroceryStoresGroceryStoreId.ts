import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Updates grocery store information by its unique identifier.
 *
 * This operation requires moderator authorization.
 *
 * @param props - Object containing moderator credentials, groceryStoreId, and
 *   update body
 * @param props.moderator - Authenticated moderator performing the update
 * @param props.groceryStoreId - UUID of the grocery store to update
 * @param props.body - Partial update data for grocery store fields
 * @returns The updated grocery store information
 * @throws {Error} When the grocery store with the given ID does not exist
 */
export async function putrecipeSharingModeratorGroceryStoresGroceryStoreId(props: {
  moderator: ModeratorPayload;
  groceryStoreId: string & tags.Format<"uuid">;
  body: IRecipeSharingGroceryStore.IUpdate;
}): Promise<IRecipeSharingGroceryStore> {
  const { moderator, groceryStoreId, body } = props;

  // Verify grocery store existence, throw if not found
  await MyGlobal.prisma.recipe_sharing_grocery_stores.findUniqueOrThrow({
    where: { id: groceryStoreId },
  });

  // Perform update with provided fields and current update timestamp
  const updated = await MyGlobal.prisma.recipe_sharing_grocery_stores.update({
    where: { id: groceryStoreId },
    data: {
      name: body.name ?? undefined,
      address: body.address ?? undefined,
      phone: body.phone ?? undefined,
      website_url: body.website_url ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated grocery store record with properly formatted dates
  return {
    id: updated.id,
    name: updated.name,
    address: updated.address ?? null,
    phone: updated.phone ?? null,
    website_url: updated.website_url ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
