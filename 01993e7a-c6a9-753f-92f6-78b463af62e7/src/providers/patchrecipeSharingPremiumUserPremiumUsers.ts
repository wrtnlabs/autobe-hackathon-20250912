import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import { IPageIRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingPremiumUser";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Search and retrieve a filtered, paginated list of premium users
 *
 * This operation retrieves a paginated list of premium users based on filter
 * criteria such as email, username, and premium_since date. It excludes
 * soft-deleted entries by filtering where deleted_at is null. Results are
 * sorted according to specified field and order parameters.
 *
 * @param props - Object containing authenticated premiumUser and request body
 * @param props.premiumUser - Authenticated premium user making the request
 * @param props.body - Filtering and pagination parameters for premium users
 * @returns Paginated list of premium users matching the filters
 * @throws {Error} Throws if invalid sortBy or order is specified (handled
 *   internally with defaults)
 */
export async function patchrecipeSharingPremiumUserPremiumUsers(props: {
  premiumUser: PremiumuserPayload;
  body: IRecipeSharingPremiumUser.IRequest;
}): Promise<IPageIRecipeSharingPremiumUser> {
  const { premiumUser, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Allowed columns to sort by
  const allowedSortBy = [
    "id",
    "email",
    "username",
    "premium_since",
    "created_at",
    "updated_at",
  ];

  const sortBy =
    body.sortBy !== null &&
    body.sortBy !== undefined &&
    allowedSortBy.includes(body.sortBy)
      ? body.sortBy
      : "created_at";

  const order =
    body.order !== null &&
    body.order !== undefined &&
    (body.order === "asc" || body.order === "desc")
      ? body.order
      : "asc";

  const where: Record<string, unknown> = { deleted_at: null };

  if (body.email !== undefined && body.email !== null) {
    where.email = { contains: body.email };
  }

  if (body.username !== undefined && body.username !== null) {
    where.username = { contains: body.username };
  }

  if (body.premium_since !== undefined && body.premium_since !== null) {
    where.premium_since = { gte: body.premium_since };
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_premiumusers.findMany({
      where,
      orderBy: { [sortBy]: order },
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
