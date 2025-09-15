import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRefreshToken";
import { IPageIOauthServerRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerRefreshToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Search and retrieve a paginated list of opaque OAuth refresh tokens.
 *
 * This operation allows a member to query their refresh tokens with pagination
 * and optional search by token string.
 *
 * @param props - The parameters including authenticated member and request body
 * @param props.member - Authenticated member payload
 * @param props.body - Request body for search and pagination
 * @returns A paginated summary of refresh tokens matching the criteria
 * @throws {Error} When the database query fails
 */
export async function patchoauthServerMemberRefreshTokens(props: {
  member: MemberPayload;
  body: IOauthServerRefreshToken.IRequest;
}): Promise<IPageIOauthServerRefreshToken.ISummary> {
  const { member, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.search !== undefined && body.search !== null
      ? {
          token: { contains: body.search },
        }
      : {}),
  };

  const [tokens, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_refresh_tokens.findMany({
      where,
      select: {
        id: true,
        token: true,
        scope: true,
        expires_at: true,
      },
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_refresh_tokens.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: tokens.map((token) => ({
      id: token.id,
      token: token.token,
      scope: token.scope,
      expires_at: toISOStringSafe(token.expires_at),
    })),
  };
}
