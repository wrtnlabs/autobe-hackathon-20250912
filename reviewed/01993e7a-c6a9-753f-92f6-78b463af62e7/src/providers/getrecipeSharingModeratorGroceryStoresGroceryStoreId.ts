import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieve grocery store information by its unique ID.
 *
 * This operation fetches the complete grocery store details including name,
 * address, phone, and website URL from the database. Soft deleted stores (with
 * non-null deleted_at) are excluded.
 *
 * Authorization: Requires authenticated moderator access.
 *
 * @param props - Object containing the moderator payload and grocery store ID
 * @param props.moderator - Authenticated moderator making the request
 * @param props.groceryStoreId - UUID of the grocery store to retrieve
 * @returns The grocery store information corresponding to the ID
 * @throws {Error} Throws if the grocery store is not found or is soft deleted
 */
export async function getrecipeSharingModeratorGroceryStoresGroceryStoreId(props: {
  moderator: ModeratorPayload;
  groceryStoreId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingGroceryStore> {
  const { moderator, groceryStoreId } = props;

  const store =
    await MyGlobal.prisma.recipe_sharing_grocery_stores.findFirstOrThrow({
      where: {
        id: groceryStoreId,
        deleted_at: null,
      },
    });

  return {
    id: store.id,
    name: store.name,
    address: store.address ?? null,
    phone: store.phone ?? null,
    website_url: store.website_url ?? null,
    created_at: toISOStringSafe(store.created_at),
    updated_at: toISOStringSafe(store.updated_at),
  };
}
