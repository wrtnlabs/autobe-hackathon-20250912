import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Deletes a manager evaluation record permanently from the database by its
 * unique ID.
 *
 * This operation requires the authenticated user to be a manager. It first
 * verifies that the evaluation exists, then performs a hard delete.
 *
 * @param props - Object containing the manager payload and the evaluation ID to
 *   delete
 * @param props.manager - The authenticated manager performing the deletion
 * @param props.id - The UUID of the manager evaluation record to be deleted
 * @throws {Error} Throws if the evaluation does not exist
 */
export async function deletejobPerformanceEvalManagerManagerEvaluationsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { manager, id } = props;

  await MyGlobal.prisma.job_performance_eval_manager_evaluations.findUniqueOrThrow(
    {
      where: { id },
    },
  );

  await MyGlobal.prisma.job_performance_eval_manager_evaluations.delete({
    where: { id },
  });
}
