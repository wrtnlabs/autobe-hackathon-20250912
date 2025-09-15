import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExportLog";
import { IPageIFlexOfficeExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeExportLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve paginated list of export logs
 *
 * This function retrieves a filtered and paginated list of export logs
 * documenting user export operations within FlexOffice. These logs include
 * export format, data targets, success or failure status, and user audit
 * details.
 *
 * Access is restricted to authenticated admin users.
 *
 * @param props - Object containing the authenticated admin user and the
 *   search/filter criteria.
 * @param props.admin - Authenticated admin user performing the search.
 * @param props.body - Request body containing search criteria and pagination
 *   parameters.
 * @returns Paginated list of export log summary information matching search
 *   criteria.
 * @throws {Error} When database query fails or unexpected error occurs.
 */
export async function patchflexOfficeAdminExportLogs(props: {
  admin: AdminPayload;
  body: IFlexOfficeExportLog.IRequest;
}): Promise<IPageIFlexOfficeExportLog.ISummary> {
  const { body } = props;

  // Default pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Construct where filter with explicit checks for undefined and null
  const where = {
    ...(body.executed_by_user_id !== undefined &&
      body.executed_by_user_id !== null && {
        executed_by_user_id: body.executed_by_user_id,
      }),
    ...(body.export_type !== undefined &&
      body.export_type !== null && { export_type: body.export_type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...((body.executed_at_from !== undefined &&
      body.executed_at_from !== null) ||
    (body.executed_at_to !== undefined && body.executed_at_to !== null)
      ? {
          executed_at: {
            ...(body.executed_at_from !== undefined &&
              body.executed_at_from !== null && { gte: body.executed_at_from }),
            ...(body.executed_at_to !== undefined &&
              body.executed_at_to !== null && { lte: body.executed_at_to }),
          },
        }
      : {}),
  };

  // Execute queries concurrently
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.flex_office_export_logs.findMany({
      where,
      orderBy: { executed_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        export_type: true,
        target_object: true,
        status: true,
        executed_by_user_id: true,
        executed_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_export_logs.count({ where }),
  ]);

  // Prepare and return paginated results with correct ISO date conversions
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: logs.map((log) => ({
      id: log.id,
      export_type: log.export_type,
      target_object: log.target_object,
      status: log.status,
      executed_by_user_id: log.executed_by_user_id,
      executed_at: toISOStringSafe(log.executed_at),
    })),
  };
}
