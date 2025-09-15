import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import { IPageIRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingPremiumUser";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Search and retrieve a filtered, paginated list of premium users
 *
 * This endpoint retrieves premium users filtered by email, username, and
 * premium activation date. It excludes soft-deleted users by filtering for
 * deleted_at = null. Supports pagination and sorting on multiple fields.
 *
 * Access is authorized for authenticated users with role "regularUser" or
 * "premiumUser".
 *
 * @param props - Object containing the authenticated regularUser and request
 *   body
 * @param props.regularUser - The authenticated regular user making the request
 * @param props.body - Request body containing filtering and pagination
 *   parameters
 * @returns Paginated list of premium users matching the search criteria
 * @throws {Error} When database access fails or parameters are invalid
 */
export async function patchrecipeSharingRegularUserPremiumUsers(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingPremiumUser.IRequest;
}): Promise<IPageIRecipeSharingPremiumUser> {
  const { regularUser, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    email?: { contains: string };
    username?: { contains: string };
    premium_since?: string & tags.Format<"date-time">;
  } = {
    deleted_at: null,
  };

  if (body.email !== undefined && body.email !== null) {
    where.email = { contains: body.email };
  }

  if (body.username !== undefined && body.username !== null) {
    where.username = { contains: body.username };
  }

  if (body.premium_since !== undefined && body.premium_since !== null) {
    where.premium_since = body.premium_since;
  }

  const validSortFields = [
    "email",
    "username",
    "premium_since",
    "created_at",
    "updated_at",
  ];
  const sortBy =
    body.sortBy && validSortFields.includes(body.sortBy)
      ? body.sortBy
      : "username";
  const order = body.order === "desc" ? "desc" : "asc";

  const orderBy: { [key: string]: "asc" | "desc" } = {
    [sortBy]: order,
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_premiumusers.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_premiumusers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((user) => ({
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      username: user.username,
      premium_since: toISOStringSafe(user.premium_since),
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    })),
  };
}
