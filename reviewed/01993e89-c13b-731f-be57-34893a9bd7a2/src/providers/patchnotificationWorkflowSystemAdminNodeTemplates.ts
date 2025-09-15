import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowNodeTemplate";
import { IPageINotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowNodeTemplate";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Search and list notification node templates with filtering and pagination
 *
 * This operation retrieves a filtered and paginated list of reusable
 * notification node templates from the notification_workflow_node_templates
 * table. Node templates include Email, SMS, and Delay template types
 * identifiable by unique codes. The operation supports searching and filtering
 * by template type and code, aiding users such as workflowManagers and
 * systemAdmins in managing available notification templates for constructing
 * workflows.
 *
 * @param props - Object containing the authenticated systemAdmin and the
 *   request body
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the operation
 * @param props.body - Filtering and pagination criteria for node template
 *   listing
 * @returns Paginated list of node template summaries matching criteria
 * @throws {Error} When required properties in body are incorrectly typed or
 *   query fails
 */
export async function patchnotificationWorkflowSystemAdminNodeTemplates(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowNodeTemplate.IRequest;
}): Promise<IPageINotificationWorkflowNodeTemplate.ISummary> {
  const { systemAdmin, body } = props;

  // Pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build prisma where clause
  const where = {
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

  // Perform the findMany and count operations in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_node_templates.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
    }),
    MyGlobal.prisma.notification_workflow_node_templates.count({ where }),
  ]);

  // Return paginated summary
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type,
    })),
  };
}
