import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import { IPageINotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflowEdge";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * List workflow edges for a given workflow with filtering and pagination.
 *
 * Retrieves paginated workflow edges within a specified workflow. Supports
 * filtering by various optional criteria provided in the request body.
 *
 * Only accessible by system administrators.
 *
 * @param props - Object containing systemAdmin authentication, workflowId path
 *   parameter, and request body filters.
 * @param props.systemAdmin - Authenticated system administrator payload.
 * @param props.workflowId - UUID of the workflow to list edges for.
 * @param props.body - Filtering and pagination criteria.
 * @returns Paginated list of workflow edges matching criteria.
 * @throws {Error} When database queries fail or unexpected errors occur.
 */
export async function patchnotificationWorkflowSystemAdminWorkflowsWorkflowIdWorkflowEdges(props: {
  systemAdmin: SystemAdminPayload;
  workflowId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowEdge.IRequest;
}): Promise<IPageINotificationWorkflowWorkflowEdge> {
  const { workflowId, body } = props;

  // Default pagination values assignment
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Constructing where condition with required workflowId and optional filters
  const where = {
    workflow_id: workflowId,
    ...(body.id !== undefined && body.id !== null && { id: body.id }),
    ...(body.from_node_id !== undefined &&
      body.from_node_id !== null && { from_node_id: body.from_node_id }),
    ...(body.to_node_id !== undefined &&
      body.to_node_id !== null && { to_node_id: body.to_node_id }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && { created_at: body.created_at }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && { updated_at: body.updated_at }),
    ...(body.deleted_at !== undefined &&
      body.deleted_at !== null && { deleted_at: body.deleted_at }),
  };

  // Fetch data and total count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_workflow_edges.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.notification_workflow_workflow_edges.count({ where }),
  ]);

  // Map results to proper API type with date strings
  const data = results.map((edge) => ({
    id: edge.id,
    workflow_id: edge.workflow_id,
    from_node_id: edge.from_node_id,
    to_node_id: edge.to_node_id,
    created_at: toISOStringSafe(edge.created_at),
    updated_at: toISOStringSafe(edge.updated_at),
    deleted_at: edge.deleted_at ? toISOStringSafe(edge.deleted_at) : null,
  }));

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
