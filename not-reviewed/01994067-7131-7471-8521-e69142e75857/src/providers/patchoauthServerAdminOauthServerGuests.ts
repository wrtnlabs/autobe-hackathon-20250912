import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerguests } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerguests";
import { IPageIOauthServerguests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerguests";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search guest accounts with pagination and filtering.
 *
 * This endpoint allows admins to retrieve a paginated and filtered list of
 * guest user accounts. Filters include creation and update date ranges as well
 * as soft delete status.
 *
 * @param props - Object containing admin authentication and search body.
 * @param props.admin - The authenticated admin user.
 * @param props.body - The search criteria for pagination and filtering.
 * @returns A paginated summary of guest accounts.
 * @throws Will throw an error if database operations fail.
 */
export async function patchoauthServerAdminOauthServerGuests(props: {
  admin: AdminPayload;
  body: IOauthServerguests.IRequest;
}): Promise<IPageIOauthServerguests.ISummary> {
  const { admin, body } = props;

  // Default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Prepare where condition with soft-delete filtering
  const where: {
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    updated_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    deleted_at: null | { not: null };
  } = {
    deleted_at: body.deleted_only === true ? { not: null } : null,
  };

  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    where.created_at = where.created_at ?? {};
    where.created_at.gte = body.created_at_from;
  }

  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    where.created_at = where.created_at ?? {};
    where.created_at.lte = body.created_at_to;
  }

  if (body.updated_at_from !== undefined && body.updated_at_from !== null) {
    where.updated_at = where.updated_at ?? {};
    where.updated_at.gte = body.updated_at_from;
  }

  if (body.updated_at_to !== undefined && body.updated_at_to !== null) {
    where.updated_at = where.updated_at ?? {};
    where.updated_at.lte = body.updated_at_to;
  }

  // Fetch records and total count concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_guests.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.oauth_server_guests.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
