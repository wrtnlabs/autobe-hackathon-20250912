import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import { IPageIRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRegularUser";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Searches and retrieves a filtered, paginated list of regular users.
 *
 * This endpoint queries the recipe_sharing_regularusers table excluding
 * soft-deleted users. Filters include email and username using partial contains
 * matching. Supports pagination with page and limit parameters.
 *
 * Sensitive fields such as password_hash are not included in the response.
 *
 * @param props - The request properties including the authenticated regularUser
 *   and filtering criteria.
 * @param props.regularUser - The authenticated regular user making the request.
 * @param props.body - The request body containing pagination and filter
 *   parameters.
 * @returns A paginated summary list of regular users matching the criteria.
 * @throws {Error} If any database or operational error occurs.
 */
export async function patchrecipeSharingRegularUserRegularUsers(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingRegularUser.IRequest;
}): Promise<IPageIRecipeSharingRegularUser.ISummary> {
  const { body } = props;
  const page = body.page ?? 0;
  const limit = body.limit ?? 10;

  const where = {
    deleted_at: null,
    ...(body.email !== undefined &&
      body.email !== null && { email: { contains: body.email } }),
    ...(body.username !== undefined &&
      body.username !== null && { username: { contains: body.username } }),
  };

  const [users, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_regularusers.findMany({
      where,
      select: { id: true, email: true, username: true },
      skip: page * limit,
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
      id: user.id,
      email: user.email,
      username: user.username,
    })),
  };
}
