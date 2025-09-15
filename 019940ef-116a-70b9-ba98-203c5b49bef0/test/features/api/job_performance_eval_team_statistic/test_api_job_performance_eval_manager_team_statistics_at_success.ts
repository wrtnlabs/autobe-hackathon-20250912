import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTeamStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTeamStatistic";

/**
 * Validates the successful retrieval of job performance evaluation team
 * statistics by an authorized manager user.
 *
 * This test covers the entire authentication setup and subsequent retrieval
 * of a specific team statistic record by its UUID. A manager user is
 * created and logged in, then the team statistic record is fetched with
 * authorization. All expected properties and data formats are validated
 * with typia.assert.
 *
 * The test assures that the API returns detailed aggregation data for team
 * performance including various average scores and metadata timestamps.
 *
 * This workflow mimics a real-world scenario where management accesses
 * vital evaluation metrics.
 *
 * Error or unauthorized scenarios are deliberately excluded as this test
 * focuses on the successful retrieval path.
 */
export async function test_api_job_performance_eval_manager_team_statistics_at_success(
  connection: api.IConnection,
) {
  // Step 1: Manager user creation (join)
  const createBody = {
    email: RandomGenerator.alphaNumeric(5) + "@company.com",
    password: "password123",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, { body: createBody });
  typia.assert(manager);

  // Step 2: Manager user login
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IJobPerformanceEvalManager.ILogin;
  const loginOutput: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.login(connection, { body: loginBody });
  typia.assert(loginOutput);

  // Step 3: Retrieve team statistics by ID
  // Use the team statistics ID from the simulated response or generate random UUID
  const teamStatisticId = typia.random<string & tags.Format<"uuid">>();
  const teamStatistic: IJobPerformanceEvalTeamStatistic =
    await api.functional.jobPerformanceEval.manager.teamStatistics.at(
      connection,
      { id: teamStatisticId },
    );
  typia.assert(teamStatistic);

  // Validate that the ID matches
  TestValidator.equals(
    "retrieved team statistic ID matches requested ID",
    teamStatistic.id,
    teamStatisticId,
  );

  // Validate score metrics are numbers within expected performance score range (1-5)
  TestValidator.predicate(
    "average performance score in valid range",
    teamStatistic.average_performance_score >= 1 &&
      teamStatistic.average_performance_score <= 5,
  );
  TestValidator.predicate(
    "average knowledge score in valid range",
    teamStatistic.average_knowledge_score >= 1 &&
      teamStatistic.average_knowledge_score <= 5,
  );
  TestValidator.predicate(
    "average problem solving score in valid range",
    teamStatistic.average_problem_solving_score >= 1 &&
      teamStatistic.average_problem_solving_score <= 5,
  );
  TestValidator.predicate(
    "average innovation score in valid range",
    teamStatistic.average_innovation_score >= 1 &&
      teamStatistic.average_innovation_score <= 5,
  );

  // Validate evaluation_count is a non-negative integer
  TestValidator.predicate(
    "evaluation count is a non-negative integer",
    Number.isInteger(teamStatistic.evaluation_count) &&
      teamStatistic.evaluation_count >= 0,
  );

  // Validate timestamps exist and are ISO 8601 date-time format
  TestValidator.predicate(
    "created_at is valid ISO 8601 string",
    (() => {
      try {
        new Date(teamStatistic.created_at);
        return !Number.isNaN(new Date(teamStatistic.created_at).getTime());
      } catch {
        return false;
      }
    })(),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 string",
    (() => {
      try {
        new Date(teamStatistic.updated_at);
        return !Number.isNaN(new Date(teamStatistic.updated_at).getTime());
      } catch {
        return false;
      }
    })(),
  );

  // If deleted_at field is present (nullable), check null or valid ISO 8601 string
  if (
    teamStatistic.deleted_at !== undefined &&
    teamStatistic.deleted_at !== null
  ) {
    TestValidator.predicate(
      "deleted_at is valid ISO 8601 string or null",
      (() => {
        try {
          new Date(teamStatistic.deleted_at);
          return !Number.isNaN(new Date(teamStatistic.deleted_at).getTime());
        } catch {
          return false;
        }
      })(),
    );
  }
}
