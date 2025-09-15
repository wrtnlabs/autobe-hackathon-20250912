import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import { IPageIRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRecipes";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Fetches a filtered, paginated list of recipes from the recipe_sharing_recipes
 * table.
 *
 * Supports filtering by title (partial match), status, created_by_id, and
 * ordering by specified fields. Implements pagination with page and limit
 * parameters. Excludes soft-deleted records by filtering where deleted_at is
 * null.
 *
 * @param props - Object containing regularUser payload and filter criteria in
 *   body
 * @param props.regularUser - Authenticated regular user's payload
 * @param props.body - Filter and pagination parameters for the recipe search
 * @returns Paginated summary list of recipes matching filters
 * @throws {Error} If any unexpected error occurs during database query
 */
export async function patchrecipeSharingRegularUserRecipes(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingRecipes.IRequest;
}): Promise<IPageIRecipeSharingRecipes.ISummary> {
  const { regularUser, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  let orderField = "created_at";
  let orderDirection: "asc" | "desc" = "desc";

  if (body.orderBy) {
    const parts = body.orderBy.trim().split(/\s+/);
    if (parts.length > 0) orderField = parts[0];
    if (parts.length > 1) {
      const dir = parts[1].toLowerCase();
      if (dir === "asc" || dir === "desc") orderDirection = dir;
    }

    const allowedFields = ["created_at", "title", "status"];
    if (!allowedFields.includes(orderField)) orderField = "created_at";
  }

  const where: {
    title?: { contains: string };
    status?: string;
    created_by_id?: string & tags.Format<"uuid">;
    deleted_at: null;
  } = {
    deleted_at: null,
  };

  if (body.title !== undefined && body.title !== null) {
    where.title = { contains: body.title };
  }
  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }
  if (body.created_by_id !== undefined && body.created_by_id !== null) {
    where.created_by_id = body.created_by_id;
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_recipes.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.recipe_sharing_recipes.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as unknown as string & tags.Format<"uuid">,
      title: item.title,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
