import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import { IPageIOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerDeveloper";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchoauthServerAdminOauthServerDevelopers(props: {
  admin: AdminPayload;
  body: IOauthServerDeveloper.IRequest;
}): Promise<IPageIOauthServerDeveloper> {
  const { admin, body } = props;

  const page = (body.page ?? 1) satisfies number as number;
  const limit = (body.limit ?? 10) satisfies number as number;

  if (page <= 0) throw new Error("Page number must be positive");
  if (limit <= 0) throw new Error("Limit must be positive");

  const where: {
    deleted_at: null;
    email?: { contains: string };
  } = {
    deleted_at: null,
  };

  if (body.search !== undefined && body.search !== null) {
    where.email = { contains: body.search };
  }

  const orderBy =
    body.sortBy === "email"
      ? {
          email:
            body.sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
        }
      : {
          created_at:
            body.sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
        };

  const skip = (page - 1) * limit;

  const [developers, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_developers.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_developers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: developers.map((dev) => ({
      id: dev.id,
      email: dev.email,
      email_verified: dev.email_verified,
      password_hash: dev.password_hash,
      created_at: toISOStringSafe(dev.created_at),
      updated_at: toISOStringSafe(dev.updated_at),
      deleted_at: dev.deleted_at ? toISOStringSafe(dev.deleted_at) : null,
    })),
  };
}
