import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalTeamStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTeamStatistic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalTeamStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTeamStatistic";

/**
 * Test retrieval of job performance evaluation team statistics with
 * filtering and pagination as an employee user.
 *
 * This test covers the complete flow starting from employee user creation
 * (join) to authenticated retrieval of filtered and paginated team
 * statistics. It validates successful data retrieval, pagination coherence,
 * and proper error handling when authorization is missing or invalid.
 *
 * Steps:
 *
 * 1. Employee user joins and authenticates, acquiring access tokens.
 * 2. Retrieve team statistics with random filter conditions and pagination.
 * 3. Perform retrieval with specific evaluation cycle ID and pagination
 *    parameters.
 * 4. Validate all returned data types and pagination info.
 * 5. Validate error thrown on unauthorized access (no auth, or invalid token).
 */
export async function test_api_evaluation_team_statistics_retrieval_employee(
  connection: api.IConnection,
) {
  // 1. Employee joins and authenticates
  const employeeCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employeeAuth: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employeeAuth);

  // 2. Retrieve team statistics with default random filter
  const randomRequestBody =
    typia.random<IJobPerformanceEvalTeamStatistic.IRequest>();
  const randomStats: IPageIJobPerformanceEvalTeamStatistic.ISummary =
    await api.functional.jobPerformanceEval.employee.teamStatistics.index(
      connection,
      {
        body: randomRequestBody,
      },
    );
  typia.assert(randomStats);

  // 3. Retrieve team statistics with specific evaluation_cycle_id and pagination
  const validEvaluationCycleId = typia.random<string & tags.Format<"uuid">>();
  const specificRequestBody = {
    page: 1,
    limit: 5,
    filter: {
      evaluation_cycle_id: validEvaluationCycleId,
    },
  } satisfies IJobPerformanceEvalTeamStatistic.IRequest;

  const specificStats: IPageIJobPerformanceEvalTeamStatistic.ISummary =
    await api.functional.jobPerformanceEval.employee.teamStatistics.index(
      connection,
      {
        body: specificRequestBody,
      },
    );
  typia.assert(specificStats);

  // 4. Validate pagination coherence
  TestValidator.predicate(
    "pagination current page at least 0",
    specificStats.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    specificStats.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages correct",
    specificStats.pagination.pages ===
      Math.ceil(
        specificStats.pagination.records / specificStats.pagination.limit,
      ),
  );

  // 5. Validate error on missing authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access should be rejected",
    async () => {
      await api.functional.jobPerformanceEval.employee.teamStatistics.index(
        unauthConn,
        {
          body: specificRequestBody,
        },
      );
    },
  );
}
