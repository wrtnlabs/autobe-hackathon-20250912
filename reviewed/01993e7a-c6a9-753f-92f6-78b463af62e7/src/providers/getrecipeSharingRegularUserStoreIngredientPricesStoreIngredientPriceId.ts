import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingStoreIngredientPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingStoreIngredientPrice";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Get detailed store ingredient price by ID
 *
 * Retrieves detailed information for a single store ingredient price entry by
 * its unique identifier. This operation allows authenticated regular users to
 * fetch complete price and availability data for a specific ingredient at a
 * specific grocery store.
 *
 * @param props - Object containing the authenticated regular user and target
 *   store ingredient price ID
 * @param props.regularUser - The authenticated regular user requesting the data
 * @param props.storeIngredientPriceId - The UUID of the store ingredient price
 *   entry to retrieve
 * @returns The detailed store ingredient price entity matching the provided ID
 * @throws {Error} Will throw if the store ingredient price with the specified
 *   ID does not exist
 */
export async function getrecipeSharingRegularUserStoreIngredientPricesStoreIngredientPriceId(props: {
  regularUser: RegularuserPayload;
  storeIngredientPriceId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingStoreIngredientPrice> {
  const { regularUser, storeIngredientPriceId } = props;

  const record =
    await MyGlobal.prisma.recipe_sharing_store_ingredient_prices.findUniqueOrThrow(
      {
        where: { id: storeIngredientPriceId },
        select: {
          id: true,
          grocery_store_id: true,
          ingredient_id: true,
          price: true,
          available: true,
          last_updated: true,
          created_at: true,
          updated_at: true,
        },
      },
    );

  return {
    id: record.id,
    grocery_store_id: record.grocery_store_id,
    ingredient_id: record.ingredient_id,
    price: record.price,
    available: record.available,
    last_updated: toISOStringSafe(record.last_updated),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
