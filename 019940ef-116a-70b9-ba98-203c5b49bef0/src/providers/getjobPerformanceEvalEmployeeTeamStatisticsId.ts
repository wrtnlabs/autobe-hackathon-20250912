import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTeamStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTeamStatistic";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Retrieve detailed job performance evaluation statistics for a specific team
 * identified by its unique ID. This includes average scores and evaluation
 * count, excluding soft deleted records.
 *
 * @param props - Object containing the authenticated employee and the statistic
 *   ID
 * @param props.employee - Authenticated employee payload
 * @param props.id - Unique identifier of the team statistic record
 * @returns Detailed job performance evaluation team statistic record
 * @throws {Error} Throws if the record does not exist or is soft deleted
 */
export async function getjobPerformanceEvalEmployeeTeamStatisticsId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalTeamStatistic> {
  const { id } = props;
  const record =
    await MyGlobal.prisma.job_performance_eval_team_statistics.findUniqueOrThrow(
      {
        where: {
          id,
          deleted_at: null,
        },
      },
    );

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
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
