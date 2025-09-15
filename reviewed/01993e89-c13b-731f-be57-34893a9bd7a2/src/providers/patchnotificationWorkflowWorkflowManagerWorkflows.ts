import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import { IPageINotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflow";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Search and retrieve a filtered, paginated list of notification workflows
 *
 * This operation supports advanced filtering on multiple workflow fields such
 * as code, name, activation status, entry node, version, and timestamps,
 * enabling efficient workflow management by workflow managers.
 *
 * @param props - Object containing the authenticated workflowManager and the
 *   filter criteria body
 * @param props.workflowManager - The authenticated workflowManager payload
 * @param props.body - The filter and pagination request body adhering to
 *   INotificationWorkflowWorkflow.IRequest
 * @returns A paginated list of notification workflows matching the filter
 *   criteria
 * @throws {Error} If any internal database or query errors occur
 */
export async function patchnotificationWorkflowWorkflowManagerWorkflows(props: {
  workflowManager: WorkflowmanagerPayload;
  body: INotificationWorkflowWorkflow.IRequest;
}): Promise<IPageINotificationWorkflowWorkflow> {
  const { workflowManager, body } = props;

  // Set default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build Prisma where condition with null and undefined filtering
  const where = {
    ...(body.code !== undefined &&
      body.code !== null && { code: { contains: body.code } }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && { is_active: body.is_active }),
    ...(body.entry_node_id !== undefined &&
      body.entry_node_id !== null && { entry_node_id: body.entry_node_id }),
    ...(body.version !== undefined &&
      body.version !== null && { version: body.version }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && { created_at: body.created_at }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && { updated_at: body.updated_at }),
    ...(body.deleted_at !== undefined &&
      body.deleted_at !== null && { deleted_at: body.deleted_at }),
  };

  // Perform database queries concurrently
  const [workflows, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_workflows.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updated_at: "desc" },
    }),
    MyGlobal.prisma.notification_workflow_workflows.count({ where }),
  ]);

  // Convert date fields to ISO strings
  const data = workflows.map((workflow) => ({
    id: workflow.id,
    code: workflow.code,
    name: workflow.name,
    is_active: workflow.is_active,
    entry_node_id: workflow.entry_node_id,
    version: workflow.version,
    created_at: toISOStringSafe(workflow.created_at),
    updated_at: toISOStringSafe(workflow.updated_at),
    deleted_at: workflow.deleted_at
      ? toISOStringSafe(workflow.deleted_at)
      : null,
  }));

  // Compose pagination metadata
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
