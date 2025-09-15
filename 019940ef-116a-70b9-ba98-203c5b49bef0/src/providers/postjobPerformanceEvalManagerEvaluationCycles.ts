import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Create a new job performance evaluation cycle.
 *
 * This endpoint allows authorized managers to create new evaluation cycles,
 * specifying unique cycle codes, human-readable names, and evaluation period
 * dates. The system handles creation timestamps and soft-delete status.
 *
 * @param props - Object containing manager authorization and evaluation cycle
 *   creation data
 * @param props.manager - Authorized manager performing the creation
 * @param props.body - Evaluation cycle creation data conforming to
 *   IJobPerformanceEvalEvaluationCycle.ICreate
 * @returns The newly created evaluation cycle entity conforming to
 *   IJobPerformanceEvalEvaluationCycle
 * @throws {Error} When an evaluation cycle with the given cycle_code already
 *   exists
 */
export async function postjobPerformanceEvalManagerEvaluationCycles(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalEvaluationCycle.ICreate;
}): Promise<IJobPerformanceEvalEvaluationCycle> {
  const { manager, body } = props;

  // Check if the cycle_code is already used
  const existing =
    await MyGlobal.prisma.job_performance_eval_evaluation_cycles.findUnique({
      where: { cycle_code: body.cycle_code },
    });
  if (existing !== null) {
    throw new Error(
      `Evaluation cycle with code '${body.cycle_code}' already exists.`,
    );
  }

  // Generate a new UUID for the cycle
  const id = v4() as string & tags.Format<"uuid">;

  // Current timestamp for created_at and updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the new evaluation cycle record
  const created =
    await MyGlobal.prisma.job_performance_eval_evaluation_cycles.create({
      data: {
        id,
        cycle_code: body.cycle_code,
        cycle_name: body.cycle_name,
        start_date: toISOStringSafe(body.start_date),
        end_date: toISOStringSafe(body.end_date),
        is_active: body.is_active,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Return the created evaluation cycle with proper date-time formatting
  return {
    id: created.id as string & tags.Format<"uuid">,
    cycle_code: created.cycle_code,
    cycle_name: created.cycle_name,
    start_date: toISOStringSafe(created.start_date),
    end_date: toISOStringSafe(created.end_date),
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
