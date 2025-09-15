import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingStoreIngredientPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingStoreIngredientPrice";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Create a new store ingredient price record.
 *
 * This function creates a record linking an ingredient with a grocery store,
 * specifying price, availability, and update timestamps according to the input
 * data. It is intended for use by authorized premium users.
 *
 * @param props - Object containing the authenticated premium user and input
 *   data
 * @param props.premiumUser - Authenticated premium user performing the
 *   operation
 * @param props.body - Data to create the store ingredient price record
 * @returns The newly created store ingredient price record with timestamps
 * @throws Will throw an error if the database operation fails or data is
 *   invalid
 */
export async function postrecipeSharingPremiumUserStoreIngredientPrices(props: {
  premiumUser: PremiumuserPayload;
  body: IRecipeSharingStoreIngredientPrice.ICreate;
}): Promise<IRecipeSharingStoreIngredientPrice> {
  const { premiumUser, body } = props;

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.recipe_sharing_store_ingredient_prices.create({
      data: {
        id,
        grocery_store_id: body.grocery_store_id,
        ingredient_id: body.ingredient_id,
        price: body.price,
        available: body.available,
        last_updated: body.last_updated,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    grocery_store_id: created.grocery_store_id,
    ingredient_id: created.ingredient_id,
    price: created.price,
    available: created.available,
    last_updated: toISOStringSafe(created.last_updated),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
