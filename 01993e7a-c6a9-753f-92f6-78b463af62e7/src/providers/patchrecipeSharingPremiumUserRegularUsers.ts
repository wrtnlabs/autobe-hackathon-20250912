import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import { IPageIRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRegularUser";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Searches and retrieves a paginated list of regular users matching filter
 * criteria.
 *
 * This endpoint allows premium users to query regular users by email and
 * username, supporting pagination and soft deletion filtering.
 *
 * @param props - Object containing premiumUser info and request body filters.
 * @param props.premiumUser - Authenticated premium user payload.
 * @param props.body - Request body with optional filters: page, limit, email,
 *   username.
 * @returns Paginated summary list of regular users without sensitive password
 *   data.
 * @throws {Error} When database query fails or invalid parameters provided.
 */
export async function patchrecipeSharingPremiumUserRegularUsers(props: {
  premiumUser: PremiumuserPayload;
  body: IRecipeSharingRegularUser.IRequest;
}): Promise<IPageIRecipeSharingRegularUser.ISummary> {
  const { premiumUser, body } = props;

  const page = (body.page ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const skip = page * limit;

  const where = {
    deleted_at: null as null,
    ...(body.email !== undefined &&
      body.email !== null && { email: { contains: body.email } }),
    ...(body.username !== undefined &&
      body.username !== null && { username: { contains: body.username } }),
  };

  const [users, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_regularusers.findMany({
      where,
      select: { id: true, email: true, username: true },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.recipe_sharing_regularusers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: users.map((user) => ({
      id: user.id as string & tags.Format<"uuid">,
      email: user.email,
      username: user.username,
    })),
  };
}
