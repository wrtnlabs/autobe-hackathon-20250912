import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerClientSecretRegeneration } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientSecretRegeneration";
import { IPageIOauthServerClientSecretRegeneration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerClientSecretRegeneration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List OAuth server client secret regeneration records.
 *
 * Retrieves a paginated list of client secret regeneration events for auditing.
 * Supports filtering by id, oauth_client_id, admin_id, regenerated_at date
 * range. Allows ordering by any field (default regenerated_at desc).
 *
 * Requires admin authorization.
 *
 * @param props - Object containing admin payload and request body filters.
 * @param props.admin - Authorized admin performing the query.
 * @param props.body - Filter and pagination parameters.
 * @returns A paginated summary of client secret regeneration records.
 * @throws Error when any database operation fails or input is invalid.
 */
export async function patchoauthServerAdminOauthServerClientSecretRegenerations(props: {
  admin: AdminPayload;
  body: IOauthServerClientSecretRegeneration.IRequest;
}): Promise<IPageIOauthServerClientSecretRegeneration.ISummary> {
  const { body } = props;

  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.id !== undefined && body.id !== null && { id: body.id }),
    ...(body.oauth_client_id !== undefined &&
      body.oauth_client_id !== null && {
        oauth_client_id: body.oauth_client_id,
      }),
    ...(body.admin_id !== undefined &&
      body.admin_id !== null && { admin_id: body.admin_id }),
    ...((body.regenerated_at_start !== undefined &&
      body.regenerated_at_start !== null) ||
    (body.regenerated_at_end !== undefined && body.regenerated_at_end !== null)
      ? {
          regenerated_at: {
            ...(body.regenerated_at_start !== undefined &&
              body.regenerated_at_start !== null && {
                gte: body.regenerated_at_start,
              }),
            ...(body.regenerated_at_end !== undefined &&
              body.regenerated_at_end !== null && {
                lte: body.regenerated_at_end,
              }),
          },
        }
      : {}),
  } as const;

  const orderBy = body.order_by
    ? (() => {
        const [field, direction] = body.order_by.split(/\s+/);
        return {
          [field]: direction?.toLowerCase() === "asc" ? "asc" : "desc",
        };
      })()
    : { regenerated_at: "desc" };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_client_secret_regenerations.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        oauth_client_id: true,
        admin_id: true,
        regenerated_at: true,
        reason: true,
      },
    }),
    MyGlobal.prisma.oauth_server_client_secret_regenerations.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      oauth_client_id: item.oauth_client_id,
      admin_id: item.admin_id,
      regenerated_at: toISOStringSafe(item.regenerated_at),
      reason: item.reason ?? null,
    })),
  };
}
