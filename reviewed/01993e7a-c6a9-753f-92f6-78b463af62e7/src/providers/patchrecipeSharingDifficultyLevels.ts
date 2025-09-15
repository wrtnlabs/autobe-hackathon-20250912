import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingDifficultyLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDifficultyLevel";
import { IPageIRecipeSharingDifficultyLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingDifficultyLevel";

/**
 * Retrieve a filtered and paginated list of difficulty levels indicating recipe
 * complexity.
 *
 * This operation supports searching, filtering, and sorting capabilities for
 * client applications.
 *
 * Results include pagination metadata and a collection of difficulty level
 * entities.
 *
 * @param props - Object containing the request body with search criteria and
 *   pagination parameters.
 * @param props.body - Request body containing filters such as search, page,
 *   limit, sort, and sortOrder.
 * @returns Paginated list of difficulty levels matching search criteria.
 * @throws {Error} Throws if any unexpected error occurs during database
 *   queries.
 */
export async function patchrecipeSharingDifficultyLevels(props: {
  body: IRecipeSharingDifficultyLevel.IRequest;
}): Promise<IPageIRecipeSharingDifficultyLevel> {
  const { body } = props;

  // Set pagination defaults
  const page = body.page ?? 0;
  const limit = body.limit ?? 20;
  const skip = page * limit;

  // Build 'where' condition for search filtering
  const where =
    body.search !== undefined && body.search !== null
      ? { name: { contains: body.search } }
      : {};

  // Compose orderBy clause with default fallback
  const orderBy =
    body.sort !== undefined && body.sort !== null
      ? { [body.sort]: body.sortOrder === "asc" ? "asc" : "desc" }
      : { created_at: "desc" };

  // Execute concurrent database operations
  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_difficulty_levels.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_difficulty_levels.count({ where }),
  ]);

  // Map database results to API DTO format with date conversions
  const data = results.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    code: r.code,
    name: r.name,
    description: r.description ?? null,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
