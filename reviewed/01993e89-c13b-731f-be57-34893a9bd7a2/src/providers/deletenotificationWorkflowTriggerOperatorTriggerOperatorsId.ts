import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TriggerOperatorPayload } from "../decorators/payload/TriggerOperatorPayload";

/**
 * Soft delete a TriggerOperator user by setting their 'deleted_at' timestamp.
 *
 * This operation requires a valid 'id' of the TriggerOperator user and
 * authorization through the 'triggerOperator' role. It marks the user as
 * deleted without removing the record from the database, preserving audit
 * trails and preventing future authentication.
 *
 * @param props - Object containing 'triggerOperator' payload and 'id' of the
 *   user to delete
 * @param props.triggerOperator - Authenticated TriggerOperator making the
 *   request
 * @param props.id - UUID of the TriggerOperator user to be soft deleted
 * @throws {Error} Throws if the user does not exist
 */
export async function deletenotificationWorkflowTriggerOperatorTriggerOperatorsId(props: {
  triggerOperator: TriggerOperatorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { triggerOperator, id } = props;

  // Verify the user exists
  await MyGlobal.prisma.notification_workflow_triggeroperators.findUniqueOrThrow(
    {
      where: { id },
    },
  );

  // Set deleted_at timestamp to mark soft deletion
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.notification_workflow_triggeroperators.update({
    where: { id },
    data: { deleted_at: deletedAt },
  });
}
