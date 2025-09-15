import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Delete a job group by ID (hard delete) in job_performance_eval_job_groups
 * table.
 *
 * Permanently remove a job group from the system by its ID. This is a hard
 * delete operation as no soft delete is defined in this schema.
 *
 * Access is restricted to the 'manager' role.
 *
 * @param props - Object containing the manager payload and job group ID to
 *   delete
 * @param props.manager - The authenticated manager performing the deletion
 * @param props.id - UUID string of the job group to delete
 * @throws {Error} When the job group with the specified ID does not exist
 */
export async function deletejobPerformanceEvalManagerJobGroupsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { manager, id } = props;

  // Verify the job group exists, throw if not found
  await MyGlobal.prisma.job_performance_eval_job_groups.findUniqueOrThrow({
    where: { id },
  });

  // Hard delete the job group
  await MyGlobal.prisma.job_performance_eval_job_groups.delete({
    where: { id },
  });
}
