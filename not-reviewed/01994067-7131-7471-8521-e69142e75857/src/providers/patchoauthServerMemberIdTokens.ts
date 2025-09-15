import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerIdToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerIdToken";
import { IPageIOauthServerIdToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerIdToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieves a paginated list of OAuth ID tokens filtered by search criteria.
 *
 * This method fetches tokens from the database where deleted_at is null (active
 * tokens), applying optional filters for oauth_client_id and expiration date
 * ranges. It returns paginated summaries of tokens including id, token string,
 * and expiration date.
 *
 * @param props - Contains authenticated member user and request body for
 *   filtering
 * @param props.member - Authenticated member payload
 * @param props.body - Filtering and pagination parameters
 * @returns Paginated summary of OAuth ID tokens matching filter criteria
 * @throws {Error} If the database query fails
 */
export async function patchoauthServerMemberIdTokens(props: {
  member: MemberPayload;
  body: IOauthServerIdToken.IRequest;
}): Promise<IPageIOauthServerIdToken.ISummary> {
  const { member, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build dynamic where filter
  const where: {
    deleted_at: null;
    oauth_client_id?: string & tags.Format<"uuid">;
    expires_at?: {
      lte?: string & tags.Format<"date-time">;
      gte?: string & tags.Format<"date-time">;
    };
  } = {
    deleted_at: null,
  };

  if (body.oauth_client_id !== undefined && body.oauth_client_id !== null) {
    where.oauth_client_id = body.oauth_client_id;
  }

  if (body.expires_before !== undefined && body.expires_before !== null) {
    where.expires_at ??= {};
    where.expires_at.lte = body.expires_before;
  }

  if (body.expires_after !== undefined && body.expires_after !== null) {
    where.expires_at ??= {};
    where.expires_at.gte = body.expires_after;
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_id_tokens.findMany({
      where: where,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_id_tokens.count({ where: where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((item) => ({
      id: item.id,
      token: item.token,
      expires_at: toISOStringSafe(item.expires_at),
    })),
  };
}
