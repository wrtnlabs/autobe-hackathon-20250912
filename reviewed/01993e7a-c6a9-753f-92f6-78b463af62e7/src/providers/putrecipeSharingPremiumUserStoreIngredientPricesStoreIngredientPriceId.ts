import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingStoreIngredientPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingStoreIngredientPrice";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Update store ingredient price by ID
 *
 * Updates the specified store ingredient price record with provided fields.
 * Supports updating price, availability status, and last updated timestamp.
 * Requires premium user authorization.
 *
 * @param props - Parameters containing premium user payload, record ID, and
 *   update body
 * @param props.premiumUser - Authenticated premium user performing the update
 * @param props.storeIngredientPriceId - UUID of the store ingredient price
 *   record to update
 * @param props.body - Partial update data for store ingredient price
 * @returns Updated store ingredient price record
 * @throws {Error} If the record identified by storeIngredientPriceId does not
 *   exist
 */
export async function putrecipeSharingPremiumUserStoreIngredientPricesStoreIngredientPriceId(props: {
  premiumUser: PremiumuserPayload;
  storeIngredientPriceId: string & tags.Format<"uuid">;
  body: IRecipeSharingStoreIngredientPrice.IUpdate;
}): Promise<IRecipeSharingStoreIngredientPrice> {
  const { premiumUser, storeIngredientPriceId, body } = props;

  // Verify existence of the record
  await MyGlobal.prisma.recipe_sharing_store_ingredient_prices.findUniqueOrThrow(
    {
      where: { id: storeIngredientPriceId },
    },
  );

  // Perform update with provided fields
  const updated =
    await MyGlobal.prisma.recipe_sharing_store_ingredient_prices.update({
      where: { id: storeIngredientPriceId },
      data: {
        price: body.price ?? undefined,
        available: body.available ?? undefined,
        last_updated: body.last_updated ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return updated record with date-time fields converted
  return {
    id: updated.id,
    grocery_store_id: updated.grocery_store_id,
    ingredient_id: updated.ingredient_id,
    price: updated.price,
    available: updated.available,
    last_updated: toISOStringSafe(updated.last_updated),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
