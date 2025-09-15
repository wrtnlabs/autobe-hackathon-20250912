import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalTeamStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTeamStatistic";

/**
 * Validates the retrieval of detailed job performance evaluation team
 * statistic by ID.
 *
 * This end-to-end test covers the complete authentication workflow for an
 * employee user including joining a new user, logging in, then fetching a
 * specific team statistic record by its unique identifier. It verifies that
 * the retrieved data matches expected DTO structure and validates all
 * fields with typia.assert for full type correctness.
 *
 * The test uses typia.random to generate realistic email, password hash,
 * and names for creating a new employee user. After successful join and
 * login, the test uses typia.random to generate a UUID for fetching the
 * team statistic.
 *
 * All API calls are awaited, and no manual token or header management is
 * performed.
 *
 * This test verifies the happy path where everything succeeds.
 */
export async function test_api_job_performance_eval_employee_team_statistics_at_success(
  connection: api.IConnection,
) {
  // 1. Employee join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: joinBody,
    });

  typia.assert(employee);

  // 2. Employee login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password_hash,
  } satisfies IJobPerformanceEvalEmployee.ILogin;

  const loginResult: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.login.loginEmployee(connection, {
      body: loginBody,
    });

  typia.assert(loginResult);

  // 3. Retrieve team statistic by id
  const statisticId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const teamStatistic: IJobPerformanceEvalTeamStatistic =
    await api.functional.jobPerformanceEval.employee.teamStatistics.at(
      connection,
      { id: statisticId },
    );

  typia.assert(teamStatistic);

  // 4. Basic sanity checks using TestValidator
  TestValidator.predicate(
    "average performance score is number",
    typeof teamStatistic.average_performance_score === "number",
  );
  TestValidator.predicate(
    "evaluation count is integer >= 0",
    Number.isInteger(teamStatistic.evaluation_count) &&
      teamStatistic.evaluation_count >= 0,
  );
  TestValidator.equals(
    "team statistic id matches",
    teamStatistic.id,
    statisticId,
  );
}
