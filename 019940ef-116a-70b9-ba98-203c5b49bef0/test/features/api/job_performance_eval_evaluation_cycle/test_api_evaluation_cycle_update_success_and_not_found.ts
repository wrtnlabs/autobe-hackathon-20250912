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
 * This E2E test verifies the update capability of the evaluation-cycles
 * endpoint for manager role. It covers:
 *
 * 1. Successful update of an existing evaluation cycle based on a filter
 * 2. Attempted update of non-existent evaluation cycle filter producing zero
 *    results
 *
 * Steps:
 *
 * - Manager user sign-up
 * - Create new evaluation cycle with valid properties
 * - Perform patch update on that cycle adjusting cycle_name and is_active
 * - Assert updated cycle is reflected in patch response data
 * - Attempt patch update with a non-existent cycle_code filter
 * - Assert the response data is empty (no matches)
 *
 * This ensures that partial update and error scenarios are covered with proper
 * type safety and business context validation.
 */
export async function test_api_evaluation_cycle_update_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Manager user joins to authenticate
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const manager = await api.functional.auth.manager.join(connection, {
    body: {
      email: managerEmail,
      password: "StrongPassword123!",
      name: RandomGenerator.name(2),
    } satisfies IJobPerformanceEvalManager.ICreate,
  });
  typia.assert(manager);

  // 2. Create evaluation cycle with realistic data
  const evaluationCycleCreateBody = {
    cycle_code: `CYCLE_${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    cycle_name: `Evaluation Cycle ${RandomGenerator.alphaNumeric(3).toUpperCase()}`,
    start_date: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    end_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.ICreate;

  const createdCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      { body: evaluationCycleCreateBody },
    );
  typia.assert(createdCycle);

  // 3. Update evaluation cycle using patch with filter on cycle_code
  const updateFilterBody = {
    cycle_code: createdCycle.cycle_code,
    cycle_name: `${createdCycle.cycle_name} - UPDATED`,
    is_active: false,
  } satisfies IJobPerformanceEvalEvaluationCycle.IRequest;

  const updatedResult =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.index(
      connection,
      { body: updateFilterBody },
    );
  typia.assert(updatedResult);

  // Verify the updatedResult includes our updated cycle entry
  TestValidator.predicate(
    "Updated result has non-empty data array",
    Array.isArray(updatedResult.data) && updatedResult.data.length > 0,
  );

  const updatedEntry = updatedResult.data.find(
    (entry) => entry.cycle_code === createdCycle.cycle_code,
  );
  TestValidator.predicate(
    "Entry with the created cycle_code exists",
    updatedEntry !== undefined,
  );

  if (updatedEntry !== undefined) {
    TestValidator.equals(
      "cycle_name is updated",
      updatedEntry.cycle_name,
      `${createdCycle.cycle_name} - UPDATED`,
    );
    TestValidator.equals("is_active is updated", updatedEntry.is_active, false);
  }

  // 4. Attempt update with non-existent cycle_code filter
  const nonExistentFilterBody = {
    cycle_code: `NON_EXISTENT_CODE_${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    cycle_name: "Should Not Exist",
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.IRequest;

  const noMatchResult =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.index(
      connection,
      { body: nonExistentFilterBody },
    );
  typia.assert(noMatchResult);

  // Result data array must be empty
  TestValidator.equals(
    "No entries for non-existent cycle_code",
    noMatchResult.data.length,
    0,
  );
}
