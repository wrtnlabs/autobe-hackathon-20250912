import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingDietCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDietCategories";
import { IPageIRecipeSharingDietCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingDietCategories";

/**
 * Retrieves a paginated and optionally filtered list of diet categories.
 *
 * This operation queries the `recipe_sharing_diet_categories` table allowing
 * search filters by code and name, pagination, and sorting.
 *
 * It returns summaries suitable for UI consumption. No authentication is
 * required.
 *
 * @param props - Object containing filtering and pagination parameters.
 * @param props.body - Filtering and pagination parameters.
 * @returns Paginated summaries of diet categories.
 * @throws {Error} If any database error occurs during querying.
 */
export async function patchrecipeSharingDietCategories(props: {
  body: IRecipeSharingDietCategories.IRequest;
}): Promise<IPageIRecipeSharingDietCategories.ISummary> {
  const { body } = props;

  // Pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  // Build where condition based on filters
  const where: {
    code?: { contains: string };
    name?: { contains: string };
  } = {};

  if (body.code !== undefined) {
    where.code = { contains: body.code };
  }
  if (body.name !== undefined) {
    where.name = { contains: body.name };
  }

  // Determine order by field and direction
  const sortableFields = ["code", "name"] as const;
  const orderByField: string =
    body.orderBy && sortableFields.includes(body.orderBy as any)
      ? body.orderBy
      : "created_at";

  const orderDirection = body.orderDirection === "asc" ? "asc" : "desc";

  // Calculate skip offset
  const skip = (page - 1) * limit;

  // Run concurrent queries for data and count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_diet_categories.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_diet_categories.count({ where }),
  ]);

  // Map DB results to API summary
  const data = results.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    code: item.code,
    name: item.name,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
