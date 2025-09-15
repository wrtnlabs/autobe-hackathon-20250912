import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerEvaluation";

/**
 * Test updating an existing evaluation score record by a manager.
 *
 * This test covers the entire update flow starting from the creation of the
 * required entities: manager user, employee user, evaluation cycle, and
 * manager evaluation record. It then creates an evaluation score record and
 * performs an update on it, verifying that the update operation correctly
 * modifies the category and score fields while maintaining referential
 * integrity and authorization.
 *
 * The sequence ensures authentication contexts are established properly,
 * type validity of requests and responses is enforced via typia.assert, and
 * business logic validations are performed using TestValidator assertions.
 * This comprehensive workflow confirms the correctness and security of the
 * evaluation score update API.
 */
export async function test_api_evaluation_score_update_by_manager_success(
  connection: api.IConnection,
) {
  // 1. Create manager user and authenticate
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: "Password123!",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Create employee user and authenticate
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employeeEmail,
        password_hash: "hashedpassword",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employee);

  // 3. Create evaluation cycle
  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const cycleCode = `EV${Date.now()}`;
  const evaluationCycle: IJobPerformanceEvalEvaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      {
        body: {
          cycle_code: cycleCode,
          cycle_name: `Cycle ${cycleCode}`,
          start_date: startDate,
          end_date: endDate,
          is_active: true,
        } satisfies IJobPerformanceEvalEvaluationCycle.ICreate,
      },
    );
  typia.assert(evaluationCycle);

  // 4. Create manager evaluation linking manager, employee, evaluation cycle
  const evaluationDate = new Date().toISOString();
  const managerEvaluation: IJobPerformanceEvalManagerEvaluation =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.create(
      connection,
      {
        body: {
          manager_id: manager.id,
          employee_id: employee.id,
          evaluation_cycle_id: evaluationCycle.id,
          evaluation_date: evaluationDate,
          work_performance_score: 3,
          knowledge_skill_score: 4,
          problem_solving_collab_score: 3,
          innovation_score: 5,
          overall_comment: "Initial evaluation comment.",
        } satisfies IJobPerformanceEvalManagerEvaluation.ICreate,
      },
    );
  typia.assert(managerEvaluation);

  // 5. Create initial evaluation score record
  const initialCategory = "work_performance";
  const initialScoreValue = 3;
  const evaluationScore: IJobPerformanceEvalEvaluationScore =
    await api.functional.jobPerformanceEval.manager.evaluationScores.create(
      connection,
      {
        body: {
          evaluation_id: managerEvaluation.id,
          category: initialCategory,
          score: initialScoreValue,
        } satisfies IJobPerformanceEvalEvaluationScore.ICreate,
      },
    );
  typia.assert(evaluationScore);

  // 6. Update evaluation score record by ID
  const updatedCategory = "knowledge_skill";
  const updatedScoreValue = 5;
  const updateBody = {
    category: updatedCategory,
    score: updatedScoreValue,
  } satisfies IJobPerformanceEvalEvaluationScore.IUpdate;

  const updatedEvaluationScore: IJobPerformanceEvalEvaluationScore =
    await api.functional.jobPerformanceEval.manager.evaluationScores.update(
      connection,
      {
        id: evaluationScore.id,
        body: updateBody,
      },
    );
  typia.assert(updatedEvaluationScore);

  // 7. Validate updated fields
  TestValidator.equals(
    "Updated category matches",
    updatedEvaluationScore.category,
    updatedCategory,
  );
  TestValidator.equals(
    "Updated score matches",
    updatedEvaluationScore.score,
    updatedScoreValue,
  );
  TestValidator.equals(
    "Evaluation ID remains unchanged",
    updatedEvaluationScore.evaluation_id,
    managerEvaluation.id,
  );
}
