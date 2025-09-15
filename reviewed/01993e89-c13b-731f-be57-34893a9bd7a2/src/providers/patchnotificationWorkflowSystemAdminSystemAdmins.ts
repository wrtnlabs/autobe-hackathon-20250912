import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import { IPageINotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowSystemAdmin";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Searches and retrieves a paginated list of system administrator user
 * summaries.
 *
 * This endpoint allows filtering by partial email matches and supports
 * pagination. Only non-deleted system administrator users are included.
 *
 * @param props - Object containing authenticated systemAdmin and request body
 * @param props.systemAdmin - The authenticated systemAdmin making the request
 * @param props.body - The request body containing optional filters and
 *   pagination info
 * @returns Paginated list of system admin user summaries matching the criteria
 * @throws {Error} If database query fails
 */
export async function patchnotificationWorkflowSystemAdminSystemAdmins(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowSystemAdmin.IRequest;
}): Promise<IPageINotificationWorkflowSystemAdmin.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereFilter = {
    deleted_at: null,
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
  };

  const [total, records] = await Promise.all([
    MyGlobal.prisma.notification_workflow_systemadmins.count({
      where: whereFilter,
    }),
    MyGlobal.prisma.notification_workflow_systemadmins.findMany({
      where: whereFilter,
      skip,
      take: limit,
      select: { id: true, email: true },
      orderBy: { email: "asc" },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      email: r.email,
    })),
  };
}
