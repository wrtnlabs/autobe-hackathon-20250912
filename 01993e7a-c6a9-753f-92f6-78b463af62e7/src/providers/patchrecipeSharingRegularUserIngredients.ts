import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import { IPageIRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingIngredient";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Search and retrieve a paginated list of ingredients. Supports filtering by
 * name, brand, and sorting with search criteria detailed in the request body.
 *
 * Requires authenticated access as a regular user.
 *
 * @param props - Object containing authenticated regular user and request body.
 * @param props.regularUser - The authenticated regular user making the request.
 * @param props.body - Request body containing filtering, sorting, and
 *   pagination parameters.
 * @returns Paginated list of ingredient summaries matching filters.
 * @throws {Error} When database operations fail.
 */
export async function patchrecipeSharingRegularUserIngredients(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingIngredient.IRequest;
}): Promise<IPageIRecipeSharingIngredient.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const search = body.search;
  const brand = body.brand;

  const where: any = {};

  if (search !== undefined && search !== null) {
    where.OR = [
      { name: { contains: search } },
      { brand: { contains: search } },
    ];
  }

  if (brand !== undefined && brand !== null) {
    where.brand = brand;
  }

  const sortBy =
    body.sortBy &&
    ["name", "brand", "created_at", "updated_at"].includes(body.sortBy)
      ? body.sortBy
      : "name";
  const sortOrder =
    body.sortOrder === "asc" || body.sortOrder === "desc"
      ? body.sortOrder
      : "asc";

  const [items, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_ingredients.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_ingredients.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      name: item.name,
      brand: item.brand ?? undefined,
    })),
  };
}
