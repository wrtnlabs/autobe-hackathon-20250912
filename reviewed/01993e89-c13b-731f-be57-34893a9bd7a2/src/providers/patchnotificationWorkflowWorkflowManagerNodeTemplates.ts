import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowNodeTemplate";
import { IPageINotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowNodeTemplate";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Search and list notification node templates with filtering and pagination
 *
 * This function retrieves filtered node templates of types 'email', 'sms', or
 * 'delay' from the database. It supports free text search on code, name, and
 * template_body fields. It returns paginated data suitable for UI consumption.
 *
 * @param props - The parameters object
 * @param props.workflowManager - The authenticated workflow manager performing
 *   the query
 * @param props.body - The filter and pagination parameters
 * @returns A paginated summary list of notification workflow node templates
 * @throws {Error} When database query fails or invalid parameters are provided
 */
export async function patchnotificationWorkflowWorkflowManagerNodeTemplates(props: {
  workflowManager: WorkflowmanagerPayload;
  body: INotificationWorkflowNodeTemplate.IRequest;
}): Promise<IPageINotificationWorkflowNodeTemplate.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    ...(body.type !== undefined && body.type !== null && { type: body.type }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { code: { contains: body.search } },
          { name: { contains: body.search } },
          { template_body: { contains: body.search } },
        ],
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_node_templates.findMany({
      where: whereCondition,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.notification_workflow_node_templates.count({
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
    data: results.map((template) => ({
      id: template.id,
      code: template.code,
      name: template.name,
      type: template.type,
    })),
  };
}
