import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";
import { IPageIOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerTokenMonitor";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Searches OAuth server token monitor records.
 *
 * Retrieves a filtered and paginated list of token monitor events. Supports
 * filtering by event type, OAuth client ID, IP address, and applies pagination
 * and sorting.
 *
 * Requires a developer authenticated user.
 *
 * @param props - Object containing developer payload and request body.
 * @param props.developer - Authenticated developer user details.
 * @param props.body - Search filters and pagination options.
 * @returns A paginated summary of token monitor events.
 * @throws {Error} Throws if any database access or unexpected error occurs.
 */
export async function patchoauthServerDeveloperOauthServerTokenMonitors(props: {
  developer: DeveloperPayload;
  body: IOauthServerTokenMonitor.IRequest;
}): Promise<IPageIOauthServerTokenMonitor.ISummary> {
  const { body } = props;

  const where = {
    ...(body.event_type !== undefined &&
      body.event_type !== null && {
        event_type: body.event_type,
      }),
    ...(body.oauth_client_id !== undefined &&
      body.oauth_client_id !== null && {
        oauth_client_id: body.oauth_client_id,
      }),
    ...(body.ip_address !== undefined &&
      body.ip_address !== null && {
        ip_address: body.ip_address,
      }),
    deleted_at: null,
  };

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const sortField = body.sortField ?? "event_timestamp";
  const sortDirection = body.sortDirection ?? "desc";

  const orderBy = {} as Record<string, "asc" | "desc">;
  orderBy[sortField] = sortDirection;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_token_monitors.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_token_monitors.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((result) => ({
      id: result.id,
      event_type: result.event_type,
      event_timestamp: toISOStringSafe(result.event_timestamp),
      ip_address: result.ip_address,
      user_agent: result.user_agent ?? null,
    })),
  };
}
