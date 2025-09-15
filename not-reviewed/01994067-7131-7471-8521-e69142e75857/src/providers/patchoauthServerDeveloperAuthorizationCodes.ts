import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import { IPageIOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerAuthorizationCode";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Search OAuth authorization codes with filters and pagination.
 *
 * This operation retrieves a paginated list of OAuth authorization codes,
 * applying filters for OAuth client ID, search text on code and redirect URI,
 * expiration time constraints, with sorting and pagination.
 *
 * Only authorized developer users can perform this query.
 *
 * @param props - Object containing authenticated developer and request body
 * @param props.developer - The authenticated developer user performing the
 *   search
 * @param props.body - Request body with filtering, sorting, and pagination
 *   parameters
 * @returns Paginated summary list of OAuth authorization codes matching
 *   criteria
 * @throws {Error} Throws if database operation fails or parameters are invalid
 */
export async function patchoauthServerDeveloperAuthorizationCodes(props: {
  developer: DeveloperPayload;
  body: IOauthServerAuthorizationCode.IRequest;
}): Promise<IPageIOauthServerAuthorizationCode.ISummary> {
  const { developer, body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 10;

  const where = {
    deleted_at: null,
    ...(body.oauth_client_id !== undefined &&
      body.oauth_client_id !== null && {
        oauth_client_id: body.oauth_client_id,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { code: { contains: body.search } },
          { redirect_uri: { contains: body.search } },
        ],
      }),
    ...((body.expires_before !== undefined && body.expires_before !== null) ||
    (body.expires_after !== undefined && body.expires_after !== null)
      ? {
          expires_at: {
            ...(body.expires_after !== undefined &&
              body.expires_after !== null && {
                gte: body.expires_after,
              }),
            ...(body.expires_before !== undefined &&
              body.expires_before !== null && {
                lte: body.expires_before,
              }),
          },
        }
      : {}),
  };

  const orderByField =
    body.orderBy === "expires_at" ? "expires_at" : "created_at";
  const orderDirection = body.orderDirection === "asc" ? "asc" : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_authorization_codes.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        oauth_client_id: true,
        code: true,
        redirect_uri: true,
        expires_at: true,
      },
    }),
    MyGlobal.prisma.oauth_server_authorization_codes.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      oauth_client_id: item.oauth_client_id,
      code: item.code,
      redirect_uri: item.redirect_uri,
      expires_at: toISOStringSafe(item.expires_at),
    })),
  };
}
