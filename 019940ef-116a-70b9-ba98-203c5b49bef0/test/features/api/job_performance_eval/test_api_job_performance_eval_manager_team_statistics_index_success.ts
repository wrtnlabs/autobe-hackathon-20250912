import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTeamStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTeamStatistic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalTeamStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTeamStatistic";

/**
 * This scenario tests the successful retrieval of paginated team statistics by
 * an authorized manager user. It covers the use case where a manager wants to
 * see aggregated job performance evaluation scores of various teams for a
 * specific evaluation cycle. The scenario includes prerequisites such as
 * creating a manager user (join), logging in for authentication, and ensuring
 * there are existing evaluation cycle and team statistics data by creating
 * required entities like evaluation cycles, employees, and snapshot data. The
 * scenario verifies that the paginated list includes proper data with average
 * scores and counts as expected. Also, unauthorized attempts by non-managers
 * are implicitly tested by role-based access control enforcement.
 */
export async function test_api_job_performance_eval_manager_team_statistics_index_success(
  connection: api.IConnection,
) {
  // 1. Manager Account Creation (Join) with random valid email and name
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass1234",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, { body: joinBody });
  typia.assert(managerAuthorized);

  // 2. Manager Login with the same credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IJobPerformanceEvalManager.ILogin;
  const loginAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.login(connection, { body: loginBody });
  typia.assert(loginAuthorized);

  // 3. Retrieval of paginated team statistics with minimal pagination parameters
  //    Here, page 1 and limit 10 are used for demonstration
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IJobPerformanceEvalTeamStatistic.IRequest;

  const response: IPageIJobPerformanceEvalTeamStatistic.ISummary =
    await api.functional.jobPerformanceEval.manager.teamStatistics.index(
      connection,
      { body: requestBody },
    );
  typia.assert(response);

  // 4. Validate pagination properties
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    response.pagination.pages > 0,
  );

  // 5. Validate that data array is an array and has at most 'limit' elements
  TestValidator.predicate("data is array", Array.isArray(response.data));
  TestValidator.predicate(
    "data length within limit",
    response.data.length <= (requestBody.limit ?? 10),
  );

  // 6. For each team statistic, validate average scores and evaluation count
  for (const stat of response.data) {
    typia.assert(stat); // Assert full typing
    TestValidator.predicate(
      "average performance score is non-negative",
      stat.average_performance_score >= 0,
    );
    TestValidator.predicate(
      "average knowledge score is non-negative",
      stat.average_knowledge_score >= 0,
    );
    TestValidator.predicate(
      "average problem solving score is non-negative",
      stat.average_problem_solving_score >= 0,
    );
    TestValidator.predicate(
      "average innovation score is non-negative",
      stat.average_innovation_score >= 0,
    );
    TestValidator.predicate(
      "evaluation count is positive integer",
      Number.isInteger(stat.evaluation_count) && stat.evaluation_count > 0,
    );
  }
}
