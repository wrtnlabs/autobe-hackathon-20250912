import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import { IPageIOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerOauthClient";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve paginated OAuth clients.
 *
 * Retrieves a filtered and paginated list of OAuth clients registered in the
 * system. Supports search by client_id, filtering by trusted status, and
 * excludes soft deleted clients.
 *
 * @param props - The request props including authenticated admin and search
 *   criteria body.
 * @param props.admin - Authenticated admin user performing the search.
 * @param props.body - Search criteria and pagination parameters for OAuth
 *   clients.
 * @returns A paginated summary list of OAuth clients matching the criteria.
 * @throws {Error} When unexpected database errors occur.
 */
export async function patchoauthServerAdminOauthClients(props: {
  admin: AdminPayload;
  body: IOauthServerOauthClient.IRequest;
}): Promise<IPageIOauthServerOauthClient.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    is_trusted?: boolean;
    client_id?: { contains: string };
  } = {
    deleted_at: null,
  };

  if (body.is_trusted !== undefined && body.is_trusted !== null) {
    where.is_trusted = body.is_trusted;
  }

  if (body.search !== undefined && body.search !== null && body.search !== "") {
    where.client_id = { contains: body.search };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_oauth_clients.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        client_id: true,
        is_trusted: true,
        logo_uri: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        client_secret: true,
        redirect_uri: true,
      },
    }),
    MyGlobal.prisma.oauth_server_oauth_clients.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((client) => ({
      id: client.id as string & tags.Format<"uuid">,
      client_id: client.client_id,
      is_trusted: client.is_trusted,
      logo_uri: client.logo_uri ?? undefined,
      deleted_at: client.deleted_at ? toISOStringSafe(client.deleted_at) : null,
      created_at: toISOStringSafe(client.created_at),
      updated_at: toISOStringSafe(client.updated_at),
      client_secret: client.client_secret ?? undefined,
      redirect_uri: client.redirect_uri ?? undefined,
    })),
  };
}
