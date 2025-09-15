import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import { IPageINotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflowManager";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Retrieves a paginated list of workflow manager users.
 *
 * Returns summary information (id and email) excluding sensitive data. Supports
 * filtering by search string for email and pagination with sorting.
 *
 * @param props - Object containing workflowManager payload and IRequest body.
 * @returns Paginated summary of workflow manager users.
 */
export async function patchnotificationWorkflowWorkflowManagerWorkflowManagers(props: {
  workflowManager: WorkflowmanagerPayload;
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

  const [results, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_workflowmanagers.findMany({
      where,
      select: {
        id: true,
        email: true,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
    data: results.map(({ id, email }) => ({ id, email })),
  };
}
