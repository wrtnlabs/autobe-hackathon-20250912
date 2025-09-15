import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import { IPageIEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationRegularUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated list of event registration regular users filtered by
 * optional criteria.
 *
 * This operation is authorized for admin users only. It supports filtering by
 * full name (partial match), email verification status, and creation date
 * ranges (created_after, created_before). Pagination is supported via page and
 * limit parameters. The users are ordered by creation date descending.
 *
 * @param props - The parameters for the operation
 * @param props.admin - The authenticated admin user
 * @param props.body - Filter and pagination parameters for querying regular
 *   users
 * @returns A paginated summary list of regular users
 * @throws {Error} Throws if database operation fails
 */
export async function patcheventRegistrationAdminRegularUsers(props: {
  admin: AdminPayload;
  body: IEventRegistrationRegularUser.IRequest;
}): Promise<IPageIEventRegistrationRegularUser.ISummary> {
  const { admin, body } = props;

  const page = (body.page ?? 1) as number & tags.Type<"int32"> as number;
  const limit = (body.limit ?? 10) as number & tags.Type<"int32"> as number;
  const skip = (page - 1) * limit;

  const where = {
    ...(body.full_name !== undefined &&
      body.full_name !== null && {
        full_name: { contains: body.full_name },
      }),
    ...(body.email_verified !== undefined &&
      body.email_verified !== null && {
        email_verified: body.email_verified,
      }),
    ...((body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && {
                gte: body.created_after,
              }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && {
                lte: body.created_before,
              }),
          },
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_regular_users.findMany({
      where,
      select: {
        id: true,
        full_name: true,
        email_verified: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_regular_users.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((user) => ({
      id: user.id as string & tags.Format<"uuid">,
      full_name: user.full_name,
      email_verified: user.email_verified,
    })),
  };
}
