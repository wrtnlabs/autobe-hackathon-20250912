import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TriggerOperatorPayload } from "../decorators/payload/TriggerOperatorPayload";

/**
 * Delete a TriggerInstance by ID permanently
 *
 * This operation deletes a TriggerInstance from
 * notification_workflow_trigger_instances table by its unique identifier. It
 * performs a hard delete operation as the model does not support soft delete.
 *
 * Access is restricted to authorized TriggerOperator users indicated by the
 * triggerOperator payload in props.
 *
 * @param props - Object containing controller parameters
 * @param props.triggerOperator - The authorized trigger operator making this
 *   request
 * @param props.triggerInstanceId - Unique identifier of the TriggerInstance to
 *   delete
 * @throws {Error} Throws if the specified triggerInstanceId does not exist, or
 *   if deletion fails
 */
export async function deletenotificationWorkflowTriggerOperatorTriggerInstancesTriggerInstanceId(props: {
  triggerOperator: TriggerOperatorPayload;
  triggerInstanceId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.notification_workflow_trigger_instances.delete({
    where: { id: props.triggerInstanceId },
  });
}
