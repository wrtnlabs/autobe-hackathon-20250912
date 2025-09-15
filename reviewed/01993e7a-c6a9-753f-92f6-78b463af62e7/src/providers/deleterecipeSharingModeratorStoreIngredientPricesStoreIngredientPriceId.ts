import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Delete a store ingredient price record by its unique ID.
 *
 * This operation permanently removes the specified store ingredient price from
 * the database. Only authorized moderators may perform this operation.
 *
 * @param props - Object containing the moderator payload and the
 *   storeIngredientPriceId
 * @param props.moderator - The authenticated moderator performing the deletion
 * @param props.storeIngredientPriceId - The UUID of the store ingredient price
 *   to delete
 * @returns Promise<void> with no content returned upon successful deletion
 * @throws {Error} If the record does not exist or deletion fails
 */
export async function deleterecipeSharingModeratorStoreIngredientPricesStoreIngredientPriceId(props: {
  moderator: ModeratorPayload;
  storeIngredientPriceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, storeIngredientPriceId } = props;

  await MyGlobal.prisma.recipe_sharing_store_ingredient_prices.delete({
    where: {
      id: storeIngredientPriceId,
    },
  });
}
