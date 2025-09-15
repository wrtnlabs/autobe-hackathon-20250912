import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";
import { IPageIOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerTokenMonitor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated list of OAuth server token monitor records filtered by
 * event type, client ID, IP address, with sorting by event timestamp.
 *
 * This operation is restricted to admin users.
 *
 * @param props - Object containing admin authentication and filter criteria
 * @param props.admin - Authenticated admin payload
 * @param props.body - Filter and pagination request parameters
 * @returns Paginated summary list of token monitor events
 * @throws {Error} When invalid pagination, filter, or sorting parameters are
 *   provided
 */
export async function patchoauthServerAdminOauthServerTokenMonitors(props: {
  admin: AdminPayload;
  body: IOauthServerTokenMonitor.IRequest;
}): Promise<IPageIOauthServerTokenMonitor.ISummary> {
  const { admin, body } = props;

  // Validate and apply pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  if (!Number.isInteger(page) || page <= 0) {
    throw new Error("Invalid page number; must be an integer greater than 0.");
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("Invalid limit; must be an integer greater than 0.");
  }

  // Validate sortField
  if (body.sortField !== undefined && body.sortField !== "event_timestamp") {
    throw new Error("Invalid sortField; only 'event_timestamp' is supported.");
  }

  // Validate sortDirection
  if (
    body.sortDirection !== undefined &&
    body.sortDirection !== "asc" &&
    body.sortDirection !== "desc"
  ) {
    throw new Error(
      "Invalid sortDirection; only 'asc' or 'desc' are supported.",
    );
  }

  const orderDirection = body.sortDirection ?? "desc";

  // Build where condition with soft delete filter
  const whereCondition: {
    event_type?: string;
    oauth_client_id?: string & tags.Format<"uuid">;
    ip_address?: string;
    deleted_at: null;
  } = { deleted_at: null };

  if (body.event_type !== undefined && body.event_type !== null) {
    whereCondition.event_type = body.event_type;
  }
  if (body.oauth_client_id !== undefined && body.oauth_client_id !== null) {
    whereCondition.oauth_client_id = body.oauth_client_id;
  }
  if (body.ip_address !== undefined && body.ip_address !== null) {
    whereCondition.ip_address = body.ip_address;
  }

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_token_monitors.findMany({
      where: whereCondition,
      orderBy: { event_timestamp: orderDirection },
      skip,
      take: limit,
      select: {
        id: true,
        event_type: true,
        event_timestamp: true,
        ip_address: true,
        user_agent: true,
      },
    }),
    MyGlobal.prisma.oauth_server_token_monitors.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      event_type: item.event_type,
      event_timestamp: toISOStringSafe(item.event_timestamp),
      ip_address: item.ip_address,
      user_agent: item.user_agent ?? null,
    })),
  };
}
