import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Delete a notification workflow node template by ID.
 *
 * This operation permanently deletes the node template identified by
 * `nodeTemplateId`. Only system administrators are authorized to perform this
 * action.
 *
 * @param props - Object containing authorization and the node template
 *   identifier.
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the deletion.
 * @param props.nodeTemplateId - UUID of the node template to delete.
 * @throws {Error} When the node template with the specified ID does not exist.
 */
export async function deletenotificationWorkflowSystemAdminNodeTemplatesNodeTemplateId(props: {
  systemAdmin: SystemAdminPayload;
  nodeTemplateId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, nodeTemplateId } = props;

  // Confirm existence of node template
  await MyGlobal.prisma.notification_workflow_node_templates.findUniqueOrThrow({
    where: { id: nodeTemplateId },
  });

  // Perform hard delete
  await MyGlobal.prisma.notification_workflow_node_templates.delete({
    where: { id: nodeTemplateId },
  });
}
