import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiIntegrationLog";
import { IPageIStoryfieldAiIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiIntegrationLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve paginated integration event logs
 * (storyfield_ai_integration_logs).
 *
 * Retrieves filtered integration logs for system administrators with advanced
 * filtering, pagination, and sorting. Results are drawn only from non-deleted
 * rows and all date fields are returned as ISO8601 strings.
 *
 * This action is restricted to users with the 'systemAdmin' role. Pagination
 * and filter defaults are enforced, and excessive page sizes throw an error.
 * Supported filters include event_type, subsystem, status, creation time range,
 * and keyword search on message. Only specific sort fields are permitted.
 *
 * @param props - SystemAdmin: Authenticated admin making the request (must be
 *   present). body: Search filters, pagination, and sorting params for the
 *   query.
 * @returns Paginated list of integration logs matching criteria.
 * @throws {Error} If the limit exceeds allowed maximum, or for invalid input.
 */
export async function patchstoryfieldAiSystemAdminIntegrationLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiIntegrationLog.IRequest;
}): Promise<IPageIStoryfieldAiIntegrationLog> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (limit > 100) throw new Error("Excessive page size");
  const skip = (page - 1) * limit;

  // Only allow sort on these fields; fallback to created_at
  const allowedSortFields = ["created_at", "status"];
  const sort_by = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by ?? "created_at")
    : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // Build Prisma where clause for flexible multi-filter search
  const where = {
    deleted_at: null,
    ...(body.event_type !== undefined &&
      body.event_type !== null && { event_type: body.event_type }),
    ...(body.subsystem !== undefined &&
      body.subsystem !== null && { subsystem: body.subsystem }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
    ...(body.keyword !== undefined &&
      body.keyword !== null && { message: { contains: body.keyword } }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_integration_logs.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.storyfield_ai_integration_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit || 1)),
    },
    data: rows.map((row) => {
      return {
        id: row.id,
        storyfield_ai_authenticateduser_id:
          row.storyfield_ai_authenticateduser_id ?? undefined,
        storyfield_ai_story_id: row.storyfield_ai_story_id ?? undefined,
        event_type: row.event_type,
        subsystem: row.subsystem,
        status: row.status,
        message: row.message ?? undefined,
        request_id: row.request_id ?? undefined,
        created_at: toISOStringSafe(row.created_at),
        updated_at: toISOStringSafe(row.updated_at),
        deleted_at:
          row.deleted_at === null || row.deleted_at === undefined
            ? undefined
            : toISOStringSafe(row.deleted_at),
      };
    }),
  };
}
