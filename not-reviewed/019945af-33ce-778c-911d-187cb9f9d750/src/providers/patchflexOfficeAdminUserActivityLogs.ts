import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeUserActivityLog";
import { IPageIFlexOfficeUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeUserActivityLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve paginated user activity logs.
 *
 * This endpoint allows an authenticated admin to filter, search, and paginate
 * through the flex_office_user_activity_logs table. Supports filtering by user
 * ID, action type, action details, IP address, and timestamps.
 *
 * @param props - Object containing the authenticated admin and the search
 *   filters in the body.
 * @param props.admin - Authenticated admin making the request.
 * @param props.body - Search criteria and pagination parameters.
 * @returns Paginated list of user activity log summaries matching the criteria.
 * @throws Error if any unexpected database or authorization errors occur.
 */
export async function patchflexOfficeAdminUserActivityLogs(props: {
  admin: AdminPayload;
  body: IFlexOfficeUserActivityLog.IRequest;
}): Promise<IPageIFlexOfficeUserActivityLog.ISummary> {
  const { admin, body } = props;

  // Pagination parameters with defaults
  // Note: page and limit are NOT defined on IRequest, so use 1 and 10 defaults
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const skip = (page - 1) * limit;

  // Construct filtering where clause with null and undefined checks
  const where = {
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.action_type !== undefined &&
      body.action_type !== null && { action_type: body.action_type }),
    ...(body.action_details !== undefined &&
      body.action_details !== null && {
        action_details: { contains: body.action_details },
      }),
    ...(body.ip_address !== undefined &&
      body.ip_address !== null && {
        ip_address: { contains: body.ip_address },
      }),
    ...((body.created_at !== undefined && body.created_at !== null) ||
    (body.updated_at !== undefined && body.updated_at !== null) ||
    (body.deleted_at !== undefined && body.deleted_at !== null)
      ? {
          AND: [
            ...(body.created_at !== undefined && body.created_at !== null
              ? [{ created_at: toISOStringSafe(body.created_at) }]
              : []),
            ...(body.updated_at !== undefined && body.updated_at !== null
              ? [{ updated_at: toISOStringSafe(body.updated_at) }]
              : []),
            ...(body.deleted_at !== undefined && body.deleted_at !== null
              ? [{ deleted_at: toISOStringSafe(body.deleted_at) }]
              : []),
          ],
        }
      : {}),
  };

  // Fetch results and total count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_user_activity_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_user_activity_logs.count({ where }),
  ]);

  // Map results to summary format with date conversion
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      action_type: item.action_type,
      action_details: item.action_details ?? null,
      ip_address: item.ip_address ?? null,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
