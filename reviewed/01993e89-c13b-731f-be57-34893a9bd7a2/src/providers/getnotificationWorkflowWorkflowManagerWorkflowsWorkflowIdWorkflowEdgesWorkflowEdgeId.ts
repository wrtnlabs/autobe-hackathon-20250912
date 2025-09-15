import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Retrieve detailed information of a specific Workflow Edge in the Notification
 * Workflow system.
 *
 * This function fetches the workflow edge matching both the workflowId and the
 * workflowEdgeId.
 *
 * Access is controlled to only workflow managers, enforced by presence of
 * workflowManager payload.
 *
 * @param props - Object containing workflowManager payload and path parameters
 *   for workflowId and workflowEdgeId
 * @returns The detailed workflow edge information conforming to
 *   INotificationWorkflowWorkflowEdge
 * @throws {Error} Throws if the specified workflow edge does not exist
 */
export async function getnotificationWorkflowWorkflowManagerWorkflowsWorkflowIdWorkflowEdgesWorkflowEdgeId(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
  workflowEdgeId: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowWorkflowEdge> {
  const { workflowManager, workflowId, workflowEdgeId } = props;

  // Fetch the workflow edge by both workflowEdgeId and workflowId
  const edge =
    await MyGlobal.prisma.notification_workflow_workflow_edges.findFirstOrThrow(
      {
        where: {
          id: workflowEdgeId,
          workflow_id: workflowId,
        },
        select: {
          id: true,
          workflow_id: true,
          from_node_id: true,
          to_node_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

  return {
    id: edge.id,
    workflow_id: edge.workflow_id,
    from_node_id: edge.from_node_id,
    to_node_id: edge.to_node_id,
    created_at: toISOStringSafe(edge.created_at),
    updated_at: toISOStringSafe(edge.updated_at),
    deleted_at: edge.deleted_at ? toISOStringSafe(edge.deleted_at) : null,
  };
}
