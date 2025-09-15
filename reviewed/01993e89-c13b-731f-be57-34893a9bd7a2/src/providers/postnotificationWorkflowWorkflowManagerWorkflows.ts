import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Creates a new notification workflow entry.
 *
 * This operation creates a new notification workflow record in the database. It
 * generates a new UUID for the id, sets creation and update timestamps, and
 * initializes the deleted_at field to null.
 *
 * The function expects authorization to be handled externally.
 *
 * @param props - The props object containing workflowManager authentication
 *   payload and the creation data.
 * @param props.workflowManager - The authenticated workflowManager payload.
 * @param props.body - The creation data for the notification workflow.
 * @returns The newly created notification workflow record.
 * @throws {Error} Throws if the database operation fails or constraints are
 *   violated.
 */
export async function postnotificationWorkflowWorkflowManagerWorkflows(props: {
  workflowManager: WorkflowmanagerPayload;
  body: INotificationWorkflowWorkflow.ICreate;
}): Promise<INotificationWorkflowWorkflow> {
  const { workflowManager, body } = props;

  const id = v4() as string & tags.Format<"uuid">;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.notification_workflow_workflows.create({
    data: {
      id,
      code: body.code,
      name: body.name,
      is_active: body.is_active,
      entry_node_id: body.entry_node_id,
      version: body.version,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    is_active: created.is_active,
    entry_node_id: created.entry_node_id,
    version: created.version,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
