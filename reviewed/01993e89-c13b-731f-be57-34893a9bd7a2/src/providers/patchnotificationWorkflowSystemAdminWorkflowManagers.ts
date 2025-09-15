import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import { IPageINotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflowManager";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Lists workflow manager users with optional filtering, pagination, and
 * sorting.
 *
 * Retrieves workflow manager user summaries excluding sensitive fields.
 *
 * This operation requires authorization by a system administrator.
 *
 * @param props - Object containing the authenticated system administrator and
 *   request body.
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the request.
 * @param props.body - Filtering and pagination request data.
 * @returns A paginated summary list of workflow manager users.
 * @throws {Error} When database access fails or invalid parameters are
 *   provided.
 */
export async function patchnotificationWorkflowSystemAdminWorkflowManagers(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowWorkflowManager.IRequest;
}): Promise<IPageINotificationWorkflowWorkflowManager.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;

  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        email: { contains: body.search },
      }),
  };

  const allowedSortFields = ["email", "created_at", "id"] as const;

  const sortBy =
    body.sortBy !== undefined &&
    body.sortBy !== null &&
    allowedSortFields.includes(body.sortBy as any)
      ? (body.sortBy as (typeof allowedSortFields)[number])
      : "created_at";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_workflowmanagers.findMany({
      where,
      select: { id: true, email: true },
      orderBy: { [sortBy]: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.notification_workflow_workflowmanagers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      email: item.email as string & tags.Format<"email">,
    })),
  };
}
