import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Get evaluation cycle details by ID
 *
 * Fetch detailed information about a single job performance evaluation cycle by
 * its unique identifier.
 *
 * This enables administrative users to view and validate properties such as
 * start and end dates, cycle codes, and active status.
 *
 * Access restrictions apply to prevent unauthorized data exposure. Only
 * managers with valid authorization may access this data.
 *
 * @param props - Object containing the manager payload and the evaluation cycle
 *   ID to fetch
 * @param props.manager - The authenticated manager performing the request
 * @param props.id - Unique identifier of the evaluation cycle
 * @returns Detailed evaluation cycle information conforming to
 *   IJobPerformanceEvalEvaluationCycle
 * @throws {Error} Throws if the evaluation cycle is not found
 */
export async function getjobPerformanceEvalManagerEvaluationCyclesId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalEvaluationCycle> {
  const record =
    await MyGlobal.prisma.job_performance_eval_evaluation_cycles.findUniqueOrThrow(
      {
        where: { id: props.id, deleted_at: null },
      },
    );

  return {
    id: record.id,
    cycle_code: record.cycle_code,
    cycle_name: record.cycle_name,
    start_date: toISOStringSafe(record.start_date),
    end_date: toISOStringSafe(record.end_date),
    is_active: record.is_active,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
