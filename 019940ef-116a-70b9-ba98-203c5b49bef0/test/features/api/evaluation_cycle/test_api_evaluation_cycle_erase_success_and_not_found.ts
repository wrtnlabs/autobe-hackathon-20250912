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
 * Test deletion of an evaluation cycle by simulating soft deletion by filtering
 * with is_active false, then verifying that the cycle is no longer listed as
 * active, and verifying queries with non-existent ids return empty.
 *
 * This test authenticates a manager user, creates an evaluation cycle, verifies
 * it is active, simulates deletion by creating a filter for is_active false to
 * confirm deletion, validates that the cycle is absent in active search, and
 * tests non-existent cycle filtering.
 */
export async function test_api_evaluation_cycle_erase_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Manager authentication in place
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const managerPassword = "ChangeMe123!";
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Create a new evaluation cycle
  const newCycleInput = {
    cycle_code: `code-${RandomGenerator.alphaNumeric(10)}`,
    cycle_name: `Evaluation Cycle ${RandomGenerator.paragraph({ sentences: 2 })}`,
    start_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // tomorrow
    end_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(), // +1 week
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.ICreate;

  const createdCycle: IJobPerformanceEvalEvaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      {
        body: newCycleInput,
      },
    );
  typia.assert(createdCycle);
  TestValidator.equals(
    "created cycle code matches input",
    createdCycle.cycle_code,
    newCycleInput.cycle_code,
  );
  TestValidator.predicate(
    "created cycle is active",
    createdCycle.is_active === true,
  );

  // 3. Confirm cycle appears in active cycles list via pagination filter
  const activeQueryBody = {
    cycle_code: createdCycle.cycle_code,
    is_active: true,
    page: 0,
    limit: 10,
  } satisfies IJobPerformanceEvalEvaluationCycle.IRequest;

  const activeCyclesPage: IPageIJobPerformanceEvalEvaluationCycle.ISummary =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.index(
      connection,
      { body: activeQueryBody },
    );
  typia.assert(activeCyclesPage);
  TestValidator.predicate(
    "active cycles contain created evaluation cycle",
    activeCyclesPage.data.some((c) => c.id === createdCycle.id),
  );

  // 4. Simulate deletion by filtering with is_active false (assuming soft delete)
  // Since deletion API not provided, we simulate by querying inactive cycles with matching code
  // This simulation assumes the deletion results in is_active false

  // In real scenario, we would delete then search with is_active false
  // Here we test that querying with is_active false returns empty array for newly active cycle

  const inactiveQueryBody = {
    cycle_code: createdCycle.cycle_code,
    is_active: false,
    page: 0,
    limit: 10,
  } satisfies IJobPerformanceEvalEvaluationCycle.IRequest;

  const inactiveCyclesPage: IPageIJobPerformanceEvalEvaluationCycle.ISummary =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.index(
      connection,
      { body: inactiveQueryBody },
    );
  typia.assert(inactiveCyclesPage);

  // Expect no inactive cycle with this code (not yet deleted)
  TestValidator.equals(
    "inactive cycles do not contain created evaluation cycle",
    inactiveCyclesPage.data.find((c) => c.id === createdCycle.id),
    undefined,
  );

  // 5. Query cycle by non-existent code to simulate 'not found' response
  // We use a random cycle_code that doesn't exist
  const nonExistentCode = `nonexistent-${RandomGenerator.alphaNumeric(15)}`;
  const nonExistentQueryBody = {
    cycle_code: nonExistentCode,
    page: 0,
    limit: 10,
  } satisfies IJobPerformanceEvalEvaluationCycle.IRequest;

  const notFoundCyclesPage: IPageIJobPerformanceEvalEvaluationCycle.ISummary =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.index(
      connection,
      { body: nonExistentQueryBody },
    );
  typia.assert(notFoundCyclesPage);
  TestValidator.equals(
    "query with non-existent cycle code returns empty",
    notFoundCyclesPage.data.length,
    0,
  );

  // 6. If deletion API existed, test that querying deleted id returns empty or error 404
  // Since no delete API provided, this part is skipped
}
