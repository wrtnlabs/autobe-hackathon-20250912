import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Retrieve detailed information of a specific Workflow Edge within a Workflow.
 *
 * This function fetches the Workflow Edge by its unique edge ID and associated
 * workflow ID ensuring the edge is active (not soft deleted). It converts all
 * date fields into ISO 8601 string format matching required API contract for
 * INotificationWorkflowWorkflowEdge.
 *
 * Access is restricted to system administrators who have been authorized prior
 * to this call.
 *
 * @param props - Object containing systemAdmin payload, workflowId and
 *   workflowEdgeId.
 * @param props.systemAdmin - The authenticated systemAdmin making the request.
 * @param props.workflowId - Unique identifier of the workflow to which the edge
 *   belongs.
 * @param props.workflowEdgeId - Unique identifier of the workflow edge.
 * @returns Detailed workflow edge information conforming to
 *   INotificationWorkflowWorkflowEdge.
 * @throws {Error} If the workflow edge is not found or if any database error
 *   occurs.
 */
export async function getnotificationWorkflowSystemAdminWorkflowsWorkflowIdWorkflowEdgesWorkflowEdgeId(props: {
  systemAdmin: SystemAdminPayload;
  workflowId: string & tags.Format<"uuid">;
  workflowEdgeId: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowWorkflowEdge> {
  const { systemAdmin, workflowId, workflowEdgeId } = props;

  const edge =
    await MyGlobal.prisma.notification_workflow_workflow_edges.findFirstOrThrow(
      {
        where: {
          id: workflowEdgeId,
          workflow_id: workflowId,
          deleted_at: null,
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
