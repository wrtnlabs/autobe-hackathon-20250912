import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test updating an existing evaluation cycle's properties such as cycle
 * code, name, start/end dates, and active flag.
 *
 * Ensure that the system enforces uniqueness of cycle codes and maintains
 * valid date ranges. Verify that only authorized manager users can perform
 * this update and that the updated data matches input values with proper
 * timestamps.
 *
 * Workflow:
 *
 * 1. Manager user signs up and authenticates.
 * 2. Manager creates a new evaluation cycle.
 * 3. Manager updates the created evaluation cycle with new data.
 * 4. Assertions verify the updated data matches input and timestamps are
 *    updated.
 */
export async function test_api_evaluation_cycle_update_success(
  connection: api.IConnection,
) {
  // 1. Manager user signs up
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: "safePassword123",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Manager creates a new evaluation cycle
  const originalCycleCreate = {
    cycle_code: `CYCLE-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    cycle_name: `Evaluation Cycle ${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.ICreate;

  const createdCycle: IJobPerformanceEvalEvaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      { body: originalCycleCreate },
    );
  typia.assert(createdCycle);

  // 3. Manager updates the created evaluation cycle with new data
  const newStartDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const newEndDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 14,
  ).toISOString();

  const updateData = {
    cycle_code: `UPD-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    cycle_name: `Updated Cycle ${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    start_date: newStartDate,
    end_date: newEndDate,
    is_active: false,
  } satisfies IJobPerformanceEvalEvaluationCycle.IUpdate;

  const updatedCycle: IJobPerformanceEvalEvaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.update(
      connection,
      { id: createdCycle.id, body: updateData },
    );
  typia.assert(updatedCycle);

  // 4. Validate the updated data matches the input values
  TestValidator.equals(
    "cycle_code updated",
    updatedCycle.cycle_code,
    updateData.cycle_code,
  );
  TestValidator.equals(
    "cycle_name updated",
    updatedCycle.cycle_name,
    updateData.cycle_name,
  );
  TestValidator.equals(
    "start_date updated",
    updatedCycle.start_date,
    updateData.start_date,
  );
  TestValidator.equals(
    "end_date updated",
    updatedCycle.end_date,
    updateData.end_date,
  );
  TestValidator.equals(
    "is_active updated",
    updatedCycle.is_active,
    updateData.is_active,
  );

  // 5. Validate id and timestamps remain valid
  TestValidator.equals("id retained", updatedCycle.id, createdCycle.id);
  TestValidator.predicate(
    "created_at is valid ISO date",
    typeof updatedCycle.created_at === "string" &&
      !isNaN(Date.parse(updatedCycle.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    typeof updatedCycle.updated_at === "string" &&
      !isNaN(Date.parse(updatedCycle.updated_at)),
  );
  TestValidator.predicate(
    "updated_at is not before created_at",
    new Date(updatedCycle.updated_at) >= new Date(updatedCycle.created_at),
  );
  TestValidator.equals("deleted_at is null", updatedCycle.deleted_at, null);
}
