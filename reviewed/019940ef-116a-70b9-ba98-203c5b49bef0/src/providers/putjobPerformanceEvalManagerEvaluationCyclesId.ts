import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Update an existing job performance evaluation cycle identified by ID.
 *
 * Allows modification of cycle code, name, start and end dates, and active
 * status. Ensures uniqueness of cycle code and updates the timestamp.
 *
 * Only authorized manager users may perform this operation.
 *
 * @param props - Object containing manager authentication, ID, and update body
 * @param props.manager - The authenticated manager performing the update
 * @param props.id - UUID of the evaluation cycle to update
 * @param props.body - Partial evaluation cycle data to update
 * @returns Updated evaluation cycle entity
 * @throws {Error} If the evaluation cycle with given ID does not exist
 * @throws {Error} If the cycle code is duplicate
 */
export async function putjobPerformanceEvalManagerEvaluationCyclesId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalEvaluationCycle.IUpdate;
}): Promise<IJobPerformanceEvalEvaluationCycle> {
  const { manager, id, body } = props;

  // Check for duplicate cycle_code if provided
  if (body.cycle_code !== undefined) {
    const existing =
      await MyGlobal.prisma.job_performance_eval_evaluation_cycles.findFirst({
        where: {
          cycle_code: body.cycle_code,
          id: { not: id },
          deleted_at: null,
        },
      });

    if (existing !== null) {
      throw new Error("Duplicate cycle_code");
    }
  }

  // Update record
  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.job_performance_eval_evaluation_cycles.update({
      where: { id },
      data: {
        cycle_code: body.cycle_code ?? undefined,
        cycle_name: body.cycle_name ?? undefined,
        start_date: body.start_date ?? undefined,
        end_date: body.end_date ?? undefined,
        is_active: body.is_active ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    cycle_code: updated.cycle_code,
    cycle_name: updated.cycle_name,
    start_date: toISOStringSafe(updated.start_date),
    end_date: toISOStringSafe(updated.end_date),
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
