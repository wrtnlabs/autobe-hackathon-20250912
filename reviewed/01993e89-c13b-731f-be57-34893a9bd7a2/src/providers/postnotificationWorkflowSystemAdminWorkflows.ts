import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Create a new notification workflow.
 *
 * This operation creates a new notification workflow record in the database
 * with the specified code, name, active status, entry node ID, and version. It
 * sets the creation and update timestamps to the current time and initializes
 * the deleted_at field to null.
 *
 * Authorization is required: only system administrators are authorized to
 * perform this operation.
 *
 * @param props - Object containing the systemAdmin payload and the workflow
 *   create body
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the operation
 * @param props.body - The data required to create a notification workflow
 * @returns The newly created notification workflow with all fields
 * @throws {Error} If the Prisma create operation fails
 */
export async function postnotificationWorkflowSystemAdminWorkflows(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowWorkflow.ICreate;
}): Promise<INotificationWorkflowWorkflow> {
  const { body } = props;
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
    id: created.id as string & tags.Format<"uuid">,
    code: created.code,
    name: created.name,
    is_active: created.is_active,
    entry_node_id: created.entry_node_id as string & tags.Format<"uuid">,
    version: created.version as number & tags.Type<"int32">,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
