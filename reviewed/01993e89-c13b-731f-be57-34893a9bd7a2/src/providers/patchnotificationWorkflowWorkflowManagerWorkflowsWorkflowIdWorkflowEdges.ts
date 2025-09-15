import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import { IPageINotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflowEdge";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * List workflow edges for a given workflow with filtering and pagination.
 *
 * Retrieves a paginated list of Workflow Edges within the specified workflow.
 * Supports filtering by id, from_node_id, to_node_id, created_at, updated_at,
 * and deleted_at. Only accessible by authorized workflow managers.
 *
 * @param props - Object containing authentication, workflow ID, and filter
 *   parameters.
 * @param props.workflowManager - The authenticated workflow manager payload.
 * @param props.workflowId - UUID of the workflow to list edges for.
 * @param props.body - Filter and pagination criteria.
 * @returns Paginated list of workflow edges matching the criteria.
 * @throws {Error} If database query fails or if authorization is invalid.
 */
export async function patchnotificationWorkflowWorkflowManagerWorkflowsWorkflowIdWorkflowEdges(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowEdge.IRequest;
}): Promise<IPageINotificationWorkflowWorkflowEdge> {
  const { workflowManager, workflowId, body } = props;

  // Default pagination values
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const skip = (page - 1) * limit;

  // Construct where clause with mandatory workflow_id and optional filters
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

  const total =
    await MyGlobal.prisma.notification_workflow_workflow_edges.count({ where });

  const rows =
    await MyGlobal.prisma.notification_workflow_workflow_edges.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      workflow_id: row.workflow_id,
      from_node_id: row.from_node_id,
      to_node_id: row.to_node_id,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
