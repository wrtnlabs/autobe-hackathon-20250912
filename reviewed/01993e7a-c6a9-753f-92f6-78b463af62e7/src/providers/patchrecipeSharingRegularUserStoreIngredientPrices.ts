import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingStoreIngredientPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingStoreIngredientPrice";
import { IPageIRecipeSharingStoreIngredientPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingStoreIngredientPrice";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieves a filtered, sorted, and paginated list of store ingredient prices.
 *
 * This endpoint allows a regular user to query ingredient prices across grocery
 * stores with flexible filtering options such as grocery store ID, ingredient
 * ID, availability, price range, and sorting order by price or last updated
 * timestamp.
 *
 * @param props - Object containing the authenticated regular user and the
 *   filter criteria.
 * @param props.regularUser - The authenticated regular user performing the
 *   request.
 * @param props.body - The filter and pagination criteria for querying the
 *   prices.
 * @returns A paginated summary list of store ingredient prices adhering to
 *   filtering and sorting.
 * @throws {Error} If any unexpected database error occurs.
 */
export async function patchrecipeSharingRegularUserStoreIngredientPrices(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingStoreIngredientPrice.IRequest;
}): Promise<IPageIRecipeSharingStoreIngredientPrice.ISummary> {
  const { regularUser, body } = props;

  const pageNum: number = body.page ?? 1;
  const limitNum: number = body.limit ?? 10;
  const skipNum = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_store_ingredient_prices.findMany({
      where: {
        ...(body.grocery_store_id !== undefined &&
          body.grocery_store_id !== null && {
            grocery_store_id: body.grocery_store_id,
          }),
        ...(body.ingredient_id !== undefined &&
          body.ingredient_id !== null && {
            ingredient_id: body.ingredient_id,
          }),
        ...(body.available !== undefined &&
          body.available !== null && {
            available: body.available,
          }),
        ...(body.min_price !== undefined &&
          body.min_price !== null && {
            price: { gte: body.min_price },
          }),
        ...(body.max_price !== undefined &&
          body.max_price !== null && {
            price: { lte: body.max_price },
          }),
      },
      orderBy:
        body.price_sort === "asc" ? { price: "asc" } : { last_updated: "desc" },
      skip: skipNum,
      take: limitNum,
      select: {
        id: true,
        grocery_store_id: true,
        ingredient_id: true,
        price: true,
        available: true,
        last_updated: true,
      },
    }),
    MyGlobal.prisma.recipe_sharing_store_ingredient_prices.count({
      where: {
        ...(body.grocery_store_id !== undefined &&
          body.grocery_store_id !== null && {
            grocery_store_id: body.grocery_store_id,
          }),
        ...(body.ingredient_id !== undefined &&
          body.ingredient_id !== null && {
            ingredient_id: body.ingredient_id,
          }),
        ...(body.available !== undefined &&
          body.available !== null && {
            available: body.available,
          }),
        ...(body.min_price !== undefined &&
          body.min_price !== null && {
            price: { gte: body.min_price },
          }),
        ...(body.max_price !== undefined &&
          body.max_price !== null && {
            price: { lte: body.max_price },
          }),
      },
    }),
  ]);

  return {
    pagination: {
      current: pageNum,
      limit: limitNum,
      records: total,
      pages: Math.ceil(total / limitNum),
    },
    data: items.map((item) => ({
      id: item.id,
      grocery_store_id: item.grocery_store_id,
      ingredient_id: item.ingredient_id,
      price: item.price,
      available: item.available,
      last_updated: toISOStringSafe(item.last_updated),
    })),
  };
}
