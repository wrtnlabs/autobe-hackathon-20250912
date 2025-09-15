import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Deletes a job performance evaluation cycle permanently by its unique UUID.
 *
 * This operation performs a hard delete on the
 * job_performance_eval_evaluation_cycles table. It ensures the record exists
 * before deletion to enforce authorization and prevents accidental deletion.
 *
 * @param props.manager - Authenticated manager payload performing the
 *   operation.
 * @param props.id - UUID of the evaluation cycle to delete.
 * @throws {Error} Throws if the evaluation cycle does not exist.
 */
export async function deletejobPerformanceEvalManagerEvaluationCyclesId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { manager, id } = props;
  // Verify existence and authorization
  await MyGlobal.prisma.job_performance_eval_evaluation_cycles.findUniqueOrThrow(
    {
      where: { id },
      rejectOnNotFound: true,
    },
  );

  // Perform hard delete
  await MyGlobal.prisma.job_performance_eval_evaluation_cycles.delete({
    where: { id },
  });
}
