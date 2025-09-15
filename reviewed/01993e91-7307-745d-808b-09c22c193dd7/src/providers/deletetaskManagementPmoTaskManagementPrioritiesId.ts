import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Deletes a task priority record from the system permanently.
 *
 * This operation performs a hard delete on the `task_management_priorities`
 * table, identified by the provided UUID. There is no soft delete support for
 * this entity.
 *
 * Only users with PMO role can perform this operation.
 *
 * @param props - Object containing authentication payload and priority ID
 * @param props.pmo - PMO role authenticated user payload
 * @param props.id - UUID of the task priority to delete
 * @throws {Error} When the specified ID does not exist or deletion fails
 */
export async function deletetaskManagementPmoTaskManagementPrioritiesId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.task_management_priorities.delete({
    where: {
      id: props.id,
    },
  });
}
