import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingCollections } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCollections";
import { IPageIRecipeSharingCollections } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingCollections";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Search and retrieve paginated list of user recipe collections.
 *
 * This PATCH operation allows an authenticated regular user to query their own
 * recipe collections, applying optional filters such as collection name,
 * pagination, and sorting. It respects soft deletion by excluding collections
 * with deleted_at set.
 *
 * @param props - Object containing the authenticated regular user and request
 *   filters.
 * @param props.regularUser - Authenticated user payload containing user ID.
 * @param props.body - Filtering and pagination parameters per
 *   IRecipeSharingCollections.IRequest.
 * @returns Paginated summary of recipe collections owned by the user.
 */
export async function patchrecipeSharingRegularUserCollections(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingCollections.IRequest;
}): Promise<IPageIRecipeSharingCollections.ISummary> {
  const { regularUser, body } = props;

  // Pagination parameters with default values
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Prepare where conditions for filtering and soft deletion check
  const whereCondition = {
    owner_user_id: regularUser.id,
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
  };

  // Parse sorting instructions: default to 'created_at desc'
  let orderByParam = { created_at: "desc" as const };
  if (body.sort) {
    const sortParts = body.sort.trim().split(" ");
    const sortField = sortParts[0] || "";
    const sortDirection = (
      sortParts[1]?.toLowerCase() === "asc" ? "asc" : "desc"
    ) as "asc" | "desc";
    // Validate sort field against allowed columns
    if (["name", "created_at", "updated_at"].includes(sortField)) {
      orderByParam = { [sortField]: sortDirection };
    }
  }

  // Execute query for matching collections and total count
  const [collections, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_collections.findMany({
      where: whereCondition,
      orderBy: orderByParam,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.recipe_sharing_collections.count({
      where: whereCondition,
    }),
  ]);

  // Map collections to API-friendly summaries converting date fields
  const data = collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    created_at: toISOStringSafe(collection.created_at),
  }));

  // Construct pagination metadata
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
