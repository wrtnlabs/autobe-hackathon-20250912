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
 * This E2E test verifies the comprehensive business flow for a manager user
 * to successfully create a job performance evaluation score record through
 * the API endpoint POST /jobPerformanceEval/manager/evaluationScores.
 *
 * The scenario covers the following steps to ensure full setup and
 * validation:
 *
 * 1. Manager account registration and authentication.
 * 2. Employee account registration to obtain a valid employee ID.
 * 3. Creation of an evaluation cycle record with proper cycle code, name,
 *    dates, and active flag.
 * 4. Creation of a manager evaluation record linking the manager, employee,
 *    and evaluation cycle, along with scores and comments.
 * 5. Creation of an evaluation score record by posting to the endpoint with
 *    the correct evaluation_id referencing the created manager evaluation
 *    record.
 * 6. Validation of all responses, verifying that every step returns data
 *    conforming to the expected types and business constraints.
 *
 * This test ensures correct chaining of entities, proper authorization
 * through the manager role, and accurate score creation with categories and
 * scores in a realistic range from 1 to 5.
 */
export async function test_api_evaluation_score_creation_success_manager(
  connection: api.IConnection,
) {
  // 1. Manager account registration and authentication
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: "P@ssw0rd1234",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Employee account registration
  const employeeEmail: string = typia.random<string & tags.Format<"email">>();
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employeeEmail,
        password_hash: "hashedpasswordexample",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employee);

  // 3. Create evaluation cycle record
  const now = new Date();
  const startDateISOString = new Date(
    now.getTime() - 7 * 24 * 3600 * 1000,
  ).toISOString();
  const endDateISOString = new Date(
    now.getTime() + 7 * 24 * 3600 * 1000,
  ).toISOString();
  const evaluationCycleCreate = {
    cycle_code: `CYCLE-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    cycle_name: `Evaluation Cycle ${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    start_date: startDateISOString,
    end_date: endDateISOString,
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.ICreate;
  const evaluationCycle: IJobPerformanceEvalEvaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      {
        body: evaluationCycleCreate,
      },
    );
  typia.assert(evaluationCycle);

  // 4. Create manager evaluation record
  const managerEvaluationCreate = {
    manager_id: manager.id,
    employee_id: employee.id,
    evaluation_cycle_id: evaluationCycle.id,
    evaluation_date: now.toISOString(),
    work_performance_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    knowledge_skill_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    problem_solving_collab_score: RandomGenerator.pick([
      1, 2, 3, 4, 5,
    ] as const),
    innovation_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    overall_comment: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 7,
    }),
  } satisfies IJobPerformanceEvalManagerEvaluation.ICreate;
  const managerEvaluation: IJobPerformanceEvalManagerEvaluation =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.create(
      connection,
      {
        body: managerEvaluationCreate,
      },
    );
  typia.assert(managerEvaluation);

  // 5. Create evaluation score record
  // Valid category and score value in 1-5 inclusive
  const categories = [
    "work_performance",
    "knowledge_skill",
    "problem_solving_collab",
    "innovation",
    "overall",
  ] as const;
  const category = RandomGenerator.pick(categories);
  const scoreValue = RandomGenerator.pick([1, 2, 3, 4, 5] as const);
  const evaluationScoreCreate = {
    evaluation_id: managerEvaluation.id,
    category: category,
    score: scoreValue,
  } satisfies IJobPerformanceEvalEvaluationScore.ICreate;
  const evaluationScore: IJobPerformanceEvalEvaluationScore =
    await api.functional.jobPerformanceEval.manager.evaluationScores.create(
      connection,
      {
        body: evaluationScoreCreate,
      },
    );
  typia.assert(evaluationScore);

  // 6. Validate that evaluation score response matches request data keys
  TestValidator.equals(
    "evaluation score evaluation_id",
    evaluationScore.evaluation_id,
    managerEvaluation.id,
  );
  TestValidator.equals(
    "evaluation score category",
    evaluationScore.category,
    category,
  );
  TestValidator.equals(
    "evaluation score value correctness",
    evaluationScore.score,
    scoreValue,
  );
}
