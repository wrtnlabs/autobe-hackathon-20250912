import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTeamStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTeamStatistic";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieve a specific job performance evaluation team statistic by ID.
 *
 * This operation fetches detailed aggregated evaluation data for a team during
 * an evaluation cycle. It returns average scores on performance metrics and
 * metadata timestamps. Access is restricted to authorized manager users.
 *
 * @param props - Request properties
 * @param props.manager - The authenticated manager user making the request
 * @param props.id - Unique identifier of the team statistic record
 * @returns The detailed job performance evaluation team statistic record
 * @throws {Error} If the record does not exist
 */
export async function getjobPerformanceEvalManagerTeamStatisticsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalTeamStatistic> {
  const { manager, id } = props;

  const record =
    await MyGlobal.prisma.job_performance_eval_team_statistics.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Validate brand of UUIDs
  typia.assertGuard<string & tags.Format<"uuid">>(record.id);
  typia.assertGuard<string & tags.Format<"uuid">>(record.evaluation_cycle_id);

  // Prepare the return object with all fields and proper date handling
  return {
    id: record.id,
    evaluation_cycle_id: record.evaluation_cycle_id,
    team_id: record.team_id,
    average_performance_score: record.average_performance_score,
    average_knowledge_score: record.average_knowledge_score,
    average_problem_solving_score: record.average_problem_solving_score,
    average_innovation_score: record.average_innovation_score,
    evaluation_count: record.evaluation_count,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
