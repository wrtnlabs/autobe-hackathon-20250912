import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Delete a task status record from the task_management_task_statuses table.
 *
 * This operation permanently removes the specified task status identified by
 * the 'id' parameter. It ensures that the status is no longer available in the
 * task lifecycle workflows.
 *
 * Authorization is enforced for the PMO role exclusively.
 *
 * @param props - Object containing the PMO authorization payload and task
 *   status ID.
 * @param props.pmo - Authenticated PMO user payload.
 * @param props.id - The UUID of the task status record to delete.
 * @throws {Error} When the specified task status record does not exist.
 */
export async function deletetaskManagementPmoTaskManagementTaskStatusesId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pmo, id } = props;

  // Authorization validation is handled by PmoAuth middleware, so proceed

  // Check if the task status record exists
  const found = await MyGlobal.prisma.task_management_task_statuses.findUnique({
    where: { id },
  });

  if (!found) throw new Error("Task status not found");

  // Delete the record permanently
  await MyGlobal.prisma.task_management_task_statuses.delete({
    where: { id },
  });
}
