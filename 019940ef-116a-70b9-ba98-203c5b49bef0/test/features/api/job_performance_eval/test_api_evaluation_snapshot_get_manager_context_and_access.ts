import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationSnapshot";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerEvaluation";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

/**
 * Validates manager context-based access to evaluation snapshots.
 *
 * This test ensures that only the authorized manager can retrieve a
 * detailed evaluation snapshot by its ID. It involves multiple actors
 * including two managers and one employee, each authenticated separately to
 * simulate real access control scenarios.
 *
 * The scenario includes:
 *
 * 1. Creating two distinct managers and authenticating each.
 * 2. Creating an employee and authenticating.
 * 3. Manager A creating a manager evaluation record linked to the employee.
 * 4. Employee creating a self-evaluation for the relevant evaluation cycle.
 * 5. Manager A retrieving the evaluation snapshot successfully.
 * 6. Manager B attempting to retrieve the same snapshot and failing
 *    authorization.
 *
 * The test asserts data integrity and access control compliance.
 */
export async function test_api_evaluation_snapshot_get_manager_context_and_access(
  connection: api.IConnection,
) {
  // 1. Manager A creation and authentication
  const managerAEmail: string = typia.random<string & tags.Format<"email">>();
  const managerAResponse: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerAEmail,
        password: "Password123!",
        name: "Manager A",
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(managerAResponse);

  // 2. Manager B creation and authentication
  const managerBEmail: string = typia.random<string & tags.Format<"email">>();
  // Create Manager B via join
  const managerBResponse: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerBEmail,
        password: "Password123!",
        name: "Manager B",
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(managerBResponse);

  // 3. Employee creation and authentication
  const employeeEmail: string = typia.random<string & tags.Format<"email">>();
  const employeeResponse: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employeeEmail,
        password_hash: "HashedPassword!",
        name: "Employee One",
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employeeResponse);

  // 4. Manager A creates a manager evaluation
  const managerEvaluationInput = {
    manager_id: managerAResponse.id,
    employee_id: employeeResponse.id,
    evaluation_cycle_id: typia.random<string & tags.Format<"uuid">>(),
    evaluation_date: new Date().toISOString(),
    work_performance_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    knowledge_skill_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    problem_solving_collab_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    innovation_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    overall_comment: "Manager evaluation comments",
  } satisfies IJobPerformanceEvalManagerEvaluation.ICreate;

  const managerEvaluation: IJobPerformanceEvalManagerEvaluation =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.create(
      connection,
      {
        body: managerEvaluationInput,
      },
    );
  typia.assert(managerEvaluation);

  // 5. Employee creates a self-evaluation
  const selfEvaluationInput = {
    evaluation_cycle_id: managerEvaluation.evaluation_cycle_id,
    evaluation_date: managerEvaluation.evaluation_date,
    work_performance_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    knowledge_skill_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    problem_solving_collab_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    innovation_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    overall_comment: "Employee self evaluation comment",
  } satisfies IJobPerformanceEvalSelfEvaluation.ICreate;

  const selfEvaluation: IJobPerformanceEvalSelfEvaluation =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.create(
      connection,
      {
        body: selfEvaluationInput,
      },
    );
  typia.assert(selfEvaluation);

  // 6. Manager A retrieves the evaluation snapshot by ID
  const evaluationSnapshot: IJobPerformanceEvalEvaluationSnapshot =
    await api.functional.jobPerformanceEval.manager.evaluationSnapshots.at(
      connection,
      {
        id: managerEvaluation.id, // Using managerEvaluation ID to fetch snapshot
      },
    );
  typia.assert(evaluationSnapshot);

  // Verify snapshot data integrity
  TestValidator.equals(
    "snapshot employee ID matches",
    evaluationSnapshot.employee_id,
    employeeResponse.id,
  );
  TestValidator.equals(
    "snapshot evaluation cycle ID matches",
    evaluationSnapshot.evaluation_cycle_id,
    managerEvaluation.evaluation_cycle_id,
  );

  // 7. Manager B attempts to retrieve the same snapshot expecting failure
  // For realistic authorization test, switch context to Manager B
  await api.functional.auth.manager.login(connection, {
    body: {
      email: managerBEmail,
      password: "Password123!",
    } satisfies IJobPerformanceEvalManager.ILogin,
  });

  await TestValidator.error("unauthorized access by Manager B", async () => {
    await api.functional.jobPerformanceEval.manager.evaluationSnapshots.at(
      connection,
      {
        id: managerEvaluation.id,
      },
    );
  });
}
