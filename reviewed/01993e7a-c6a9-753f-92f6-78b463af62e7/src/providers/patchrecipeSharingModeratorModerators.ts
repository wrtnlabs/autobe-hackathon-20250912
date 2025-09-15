import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import { IPageIRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Search and retrieve a list of moderator user accounts
 *
 * This operation retrieves a paginated list of moderators from the Recipe
 * Sharing Backend system. It supports filtering by email and username, sorting
 * by several fields, and pagination parameters page and limit.
 *
 * Authorization is enforced via the moderator role.
 *
 * @param props - Object containing moderator context and request filters
 * @param props.moderator - The authenticated moderator making the request
 * @param props.body - The request body containing filters, pagination, and
 *   sorting parameters
 * @returns The paged list of moderator summaries matching the criteria
 * @throws {Error} If any unexpected database error occurs
 */
export async function patchrecipeSharingModeratorModerators(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingModerator.IRequest;
}): Promise<IPageIRecipeSharingModerator.ISummary> {
  const { body } = props;
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 10;

  const page = typeof pageRaw === "number" && pageRaw > 0 ? pageRaw : 1;
  const limit = typeof limitRaw === "number" && limitRaw > 0 ? limitRaw : 10;
  const skip = (page - 1) * limit;

  const where: {
    email?: string;
    username?: string;
    deleted_at: null;
  } = { deleted_at: null };

  if (body.email !== undefined && body.email !== null) {
    where.email = body.email;
  }

  if (body.username !== undefined && body.username !== null) {
    where.username = body.username;
  }

  const allowedSortColumns = ["email", "username", "created_at", "updated_at"];
  const sortBy = allowedSortColumns.includes(body.sortBy ?? "")
    ? body.sortBy!
    : "created_at";
  const sortDirection = body.sortDirection === "asc" ? "asc" : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_moderators.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
      },
      orderBy: { [sortBy]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_moderators.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results,
  };
}
