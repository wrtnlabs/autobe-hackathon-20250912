import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Soft delete a manager by ID in the Job Performance Evaluation system.
 *
 * This operation marks the manager record as deleted by setting the deleted_at
 * timestamp. It preserves audit trail integrity by not physically removing the
 * record.
 *
 * Only authenticated managers can perform deletion.
 *
 * @param props - Object containing the authenticated manager and the ID of the
 *   manager to delete
 * @param props.manager - The authenticated manager performing the deletion
 * @param props.id - UUID of the manager to soft delete
 * @returns Void
 * @throws {Error} Throws if the manager to delete does not exist or is already
 *   deleted
 */
export async function deletejobPerformanceEvalManagerManagersId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { manager, id } = props;

  const existingManager =
    await MyGlobal.prisma.job_performance_eval_managers.findUnique({
      where: { id },
      select: { id: true, deleted_at: true },
    });

  if (!existingManager || existingManager.deleted_at !== null) {
    throw new Error("Manager not found or already deleted");
  }

  const deletedAt = toISOStringSafe(new Date());

  await MyGlobal.prisma.job_performance_eval_managers.update({
    where: { id },
    data: { deleted_at: deletedAt },
  });
}
