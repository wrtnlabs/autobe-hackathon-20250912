import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerEvaluation";

export async function test_api_manager_evaluations_get_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a manager user
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // 2. Create an employee user independently (no authentication required)
  const employeeCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // 3. Create an evaluation cycle using authenticated manager session
  const now = new Date();
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const cycleCreateBody = {
    cycle_code: `cycle-${RandomGenerator.alphaNumeric(6)}`,
    cycle_name: `Evaluation Cycle ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 })}`,
    start_date: now.toISOString(),
    end_date: oneMonthLater.toISOString(),
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.ICreate;

  const cycle: IJobPerformanceEvalEvaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      {
        body: cycleCreateBody,
      },
    );
  typia.assert(cycle);

  // 4. Create a manager evaluation for the employee in the evaluation cycle
  // Scores between 1 and 5 inclusive
  const managerEvaluationCreateBody = {
    manager_id: manager.id,
    employee_id: employee.id,
    evaluation_cycle_id: cycle.id,
    evaluation_date: now.toISOString(),
    work_performance_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    knowledge_skill_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    problem_solving_collab_score: RandomGenerator.pick([
      1, 2, 3, 4, 5,
    ] as const),
    innovation_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    overall_comment: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IJobPerformanceEvalManagerEvaluation.ICreate;

  const createdEvaluation: IJobPerformanceEvalManagerEvaluation =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.create(
      connection,
      {
        body: managerEvaluationCreateBody,
      },
    );
  typia.assert(createdEvaluation);

  // 5. Retrieve the created manager evaluation by its ID
  const fetchedEvaluation: IJobPerformanceEvalManagerEvaluation =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.at(
      connection,
      {
        id: createdEvaluation.id,
      },
    );
  typia.assert(fetchedEvaluation);

  // 6. Validate the retrieved evaluation matches the created evaluation
  // For deep equality, we accept the timestamps created_at and updated_at from response
  TestValidator.equals(
    "manager evaluation ID",
    fetchedEvaluation.id,
    createdEvaluation.id,
  );
  TestValidator.equals(
    "manager evaluation manager_id",
    fetchedEvaluation.manager_id,
    createdEvaluation.manager_id,
  );
  TestValidator.equals(
    "manager evaluation employee_id",
    fetchedEvaluation.employee_id,
    createdEvaluation.employee_id,
  );
  TestValidator.equals(
    "manager evaluation cycle_id",
    fetchedEvaluation.evaluation_cycle_id,
    createdEvaluation.evaluation_cycle_id,
  );
  TestValidator.equals(
    "manager evaluation date",
    fetchedEvaluation.evaluation_date,
    createdEvaluation.evaluation_date,
  );
  TestValidator.equals(
    "manager evaluation work performance score",
    fetchedEvaluation.work_performance_score,
    createdEvaluation.work_performance_score,
  );
  TestValidator.equals(
    "manager evaluation knowledge skill score",
    fetchedEvaluation.knowledge_skill_score,
    createdEvaluation.knowledge_skill_score,
  );
  TestValidator.equals(
    "manager evaluation problem solving collaboration score",
    fetchedEvaluation.problem_solving_collab_score,
    createdEvaluation.problem_solving_collab_score,
  );
  TestValidator.equals(
    "manager evaluation innovation score",
    fetchedEvaluation.innovation_score,
    createdEvaluation.innovation_score,
  );
  TestValidator.equals(
    "manager evaluation overall comment",
    fetchedEvaluation.overall_comment,
    createdEvaluation.overall_comment,
  );
  TestValidator.predicate(
    "manager evaluation has created_at",
    fetchedEvaluation.created_at !== null &&
      fetchedEvaluation.created_at !== undefined,
  );
  TestValidator.predicate(
    "manager evaluation has updated_at",
    fetchedEvaluation.updated_at !== null &&
      fetchedEvaluation.updated_at !== undefined,
  );
}
