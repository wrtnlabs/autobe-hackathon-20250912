import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEvaluationCycle";

/**
 * Validate evaluating cycle retrieval by valid and invalid cycle_code for
 * manager.
 *
 * This test performs these steps:
 *
 * 1. Authenticate a manager user using POST /auth/manager/join.
 * 2. Retrieve a list of evaluation cycles via PATCH
 *    /jobPerformanceEval/manager/evaluationCycles.
 * 3. Pick a valid evaluation cycle from the list for detailed retrieval
 *    simulation.
 * 4. Retrieve evaluation cycle by filtering with its unique cycle_code and
 *    confirm details.
 * 5. Query with a non-existent cycle_code and confirm no cycles are returned
 *    (simulating not found).
 *
 * Note: API does not provide a direct 'get by ID' endpoint, so we use
 * filtering by cycle_code to simulate detail retrieval. This validates the
 * presence and absence (not found) business logic.
 */
export async function test_api_evaluation_cycle_at_valid_and_not_found(
  connection: api.IConnection,
) {
  // 1. Manager authentication
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: "123456",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Retrieve evaluation cycles (paginated list)
  const evaluationCyclesResponse: IPageIJobPerformanceEvalEvaluationCycle.ISummary =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IJobPerformanceEvalEvaluationCycle.IRequest,
      },
    );
  typia.assert(evaluationCyclesResponse);

  // Continue only if there is at least one evaluation cycle
  TestValidator.predicate(
    "at least one evaluation cycle retrieved",
    evaluationCyclesResponse.data.length > 0,
  );

  // 3. Pick the first evaluation cycle for retrieval
  const validCycle = evaluationCyclesResponse.data[0];
  typia.assert(validCycle);

  // 4. Retrieve evaluation cycle by filtering with cycle_code
  const filteredResponse: IPageIJobPerformanceEvalEvaluationCycle.ISummary =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.index(
      connection,
      {
        body: {
          cycle_code: validCycle.cycle_code,
          page: 1,
          limit: 1,
        } satisfies IJobPerformanceEvalEvaluationCycle.IRequest,
      },
    );
  typia.assert(filteredResponse);

  TestValidator.equals(
    "single evaluation cycle found by cycle_code",
    filteredResponse.data.length,
    1,
  );
  TestValidator.equals(
    "retrieved cycle id matches",
    filteredResponse.data[0].id,
    validCycle.id,
  );
  TestValidator.equals(
    "retrieved cycle code matches",
    filteredResponse.data[0].cycle_code,
    validCycle.cycle_code,
  );
  TestValidator.equals(
    "retrieved cycle name matches",
    filteredResponse.data[0].cycle_name,
    validCycle.cycle_name,
  );
  TestValidator.equals(
    "retrieved cycle is_active matches",
    filteredResponse.data[0].is_active,
    validCycle.is_active,
  );

  // 5. Test retrieval with non-existent cycle code (simulate not found)
  const nonExistentCycleCode: string = (
    typia.random<string>() + Date.now().toString()
  ).substring(0, 20);

  const notFoundResponse: IPageIJobPerformanceEvalEvaluationCycle.ISummary =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.index(
      connection,
      {
        body: {
          cycle_code: nonExistentCycleCode,
          page: 1,
          limit: 10,
        } satisfies IJobPerformanceEvalEvaluationCycle.IRequest,
      },
    );

  typia.assert(notFoundResponse);
  TestValidator.equals(
    "no evaluation cycle for non-existent cycle_code",
    notFoundResponse.data.length,
    0,
  );
}
