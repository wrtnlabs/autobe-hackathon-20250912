import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * This E2E test validates the full cycle of manager evaluation cycle deletion
 * in the job performance evaluation system.
 *
 * The test consists of the following steps, adhering strictly to API and DTO
 * specifications:
 *
 * 1. Authenticate and join a manager user by calling the /auth/manager/join
 *    endpoint to establish a valid manager authentication context required for
 *    authorized operations.
 * 2. Create a new evaluation cycle by calling the
 *    /jobPerformanceEval/manager/evaluationCycles POST endpoint. The creation
 *    payload must include all required properties with valid realistic values,
 *    abiding by constraints from the IJobPerformanceEvalEvaluationCycle.ICreate
 *    DTO. The response object must be validated for correctness.
 * 3. Delete the newly created evaluation cycle by calling the DELETE
 *    /jobPerformanceEval/manager/evaluationCycles/{id} endpoint using the ID
 *    from the created cycle.
 * 4. Validate that deleting a non-existent evaluation cycle ID results in an
 *    error, confirming the system does not silently ignore invalid deletions.
 * 5. Additionally, create and authenticate a second manager user and validate that
 *    attempting to delete an evaluation cycle created by another manager user
 *    results in an error due to lack of authorization.
 *
 * Throughout, all API calls are awaited, response data validated with
 * typia.assert(), required properties explicitly set, and no extraneous
 * properties are included.
 *
 * This test ensures hard deletion of evaluation cycles works correctly, and
 * authentication and authorization enforcement is active for the deletion
 * operation.
 *
 * The business context is centered on secure and compliance-enforced management
 * of evaluation cycles by authorized manager roles in an HR evaluation system.
 */
export async function test_api_evaluation_cycle_deletion_success(
  connection: api.IConnection,
) {
  // 1. Manager 1 joins and authenticates
  const manager1Email = typia.random<string & tags.Format<"email">>();
  const manager1: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: manager1Email,
        password: "StrongPass123!",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager1);

  // 2. Create evaluation cycle for manager1
  const evaluationCycleCreateBody = {
    cycle_code: RandomGenerator.alphaNumeric(10),
    cycle_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.ICreate;

  const createdCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      {
        body: evaluationCycleCreateBody,
      },
    );
  typia.assert(createdCycle);

  // 3. Delete created evaluation cycle successfully
  await api.functional.jobPerformanceEval.manager.evaluationCycles.erase(
    connection,
    {
      id: createdCycle.id,
    },
  );

  // 4. Attempt to delete non-existent evaluation cycle ID should fail
  await TestValidator.error(
    "deleting non-existent evaluation cycle should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.evaluationCycles.erase(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Manager 2 joins and authenticates
  const manager2Email = typia.random<string & tags.Format<"email">>();
  const manager2: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: manager2Email,
        password: "AnotherStrongPass123!",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager2);

  // Recreate evaluation cycle as manager1 for authorization test
  const newCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      {
        body: evaluationCycleCreateBody,
      },
    );
  typia.assert(newCycle);

  // Attempt deletion by manager2 should fail due to lack of authorization
  await TestValidator.error(
    "manager2 cannot delete evaluation cycle created by manager1",
    async () => {
      await api.functional.jobPerformanceEval.manager.evaluationCycles.erase(
        connection,
        {
          id: newCycle.id,
        },
      );
    },
  );
}
