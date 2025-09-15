import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAccessToken";
import { IPageIOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerAccessToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search OAuth access tokens with filtering and pagination.
 *
 * This operation allows administrators to retrieve a paginated list of OAuth
 * access tokens with optional filtering by client ID, scope, and expiration
 * date ranges.
 *
 * @param props - Object containing admin payload and search request body.
 * @param props.admin - The authenticated administrator performing the search.
 * @param props.body - Filter and pagination criteria for the access tokens.
 * @returns Paginated access token summaries including IDs, token strings,
 *   scopes, and expirations.
 * @throws {Error} Propagates any unexpected Prisma client or database errors.
 */
export async function patchoauthServerAdminAccessTokens(props: {
  admin: AdminPayload;
  body: IOauthServerAccessToken.IRequest;
}): Promise<IPageIOauthServerAccessToken.ISummary> {
  const { admin, body } = props;

  // Define pagination with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Construct where filter object
  const where: {
    deleted_at: null;
    oauth_client_id?: string;
    scope?: string;
    expires_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    deleted_at: null,
  };

  if (body.oauth_client_id !== undefined && body.oauth_client_id !== null) {
    where.oauth_client_id = body.oauth_client_id;
  }
  if (body.scope !== undefined && body.scope !== null) {
    where.scope = body.scope;
  }
  if (
    (body.expires_from !== undefined && body.expires_from !== null) ||
    (body.expires_to !== undefined && body.expires_to !== null)
  ) {
    where.expires_at = {};
    if (body.expires_from !== undefined && body.expires_from !== null) {
      where.expires_at.gte = body.expires_from;
    }
    if (body.expires_to !== undefined && body.expires_to !== null) {
      where.expires_at.lte = body.expires_to;
    }
  }

  // Concurrently fetch filtered results and total count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_access_tokens.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_access_tokens.count({ where }),
  ]);

  // Return paginated summary
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((token) => ({
      id: token.id,
      token: token.token,
      scope: token.scope,
      expires_at: toISOStringSafe(token.expires_at),
    })),
  };
}
