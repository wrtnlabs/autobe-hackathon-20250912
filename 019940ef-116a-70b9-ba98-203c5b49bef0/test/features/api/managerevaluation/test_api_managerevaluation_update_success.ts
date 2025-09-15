import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerEvaluation";

/**
 * This test function validates the update operation of a manager evaluation
 * in the job performance evaluation system. It performs the following
 * sequence:
 *
 * 1. Creates a manager user and authenticates.
 * 2. Creates an employee user.
 * 3. Creates an evaluation cycle with realistic dates.
 * 4. Creates an initial manager evaluation record linking to the above
 *    entities.
 * 5. Updates the manager evaluation with new scores and an updated comment.
 * 6. Asserts that the update was successful by checking returned data
 *    integrity and timestamps.
 *
 * It ensures role-based authentication, data consistency, and proper usage
 * of DTOs and API calls. This test confirms that the update endpoint
 * functions as expected with valid input.
 */
export async function test_api_managerevaluation_update_success(
  connection: api.IConnection,
) {
  // 1. Create a manager user and authenticate
  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@example.com",
        password: "Password123!",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(managerAuthorized);

  // 2. Create an employee user
  const employeeAuthorized: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@example.org",
        password_hash: "hashedpassword123",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employeeAuthorized);

  // 3. Create an evaluation cycle
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const evaluationCycle: IJobPerformanceEvalEvaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      {
        body: {
          cycle_code: RandomGenerator.alphaNumeric(6),
          cycle_name: "Cycle " + RandomGenerator.paragraph({ sentences: 3 }),
          start_date: now.toISOString(),
          end_date: nextMonth.toISOString(),
          is_active: true,
        } satisfies IJobPerformanceEvalEvaluationCycle.ICreate,
      },
    );
  typia.assert(evaluationCycle);

  // 4. Create an initial manager evaluation
  const initialEvaluationBody = {
    manager_id: managerAuthorized.id,
    employee_id: employeeAuthorized.id,
    evaluation_cycle_id: evaluationCycle.id,
    evaluation_date: now.toISOString(),
    work_performance_score: 3,
    knowledge_skill_score: 3,
    problem_solving_collab_score: 3,
    innovation_score: 3,
    overall_comment: "Initial evaluation comment.",
  } satisfies IJobPerformanceEvalManagerEvaluation.ICreate;

  const initialEvaluation: IJobPerformanceEvalManagerEvaluation =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.create(
      connection,
      {
        body: initialEvaluationBody,
      },
    );
  typia.assert(initialEvaluation);

  // 5. Update the manager evaluation
  const updatedComment = "Updated evaluation comment with improvements.";
  const updateBody = {
    work_performance_score: 5,
    knowledge_skill_score: 4,
    problem_solving_collab_score: 5,
    innovation_score: 4,
    overall_comment: updatedComment,
  } satisfies IJobPerformanceEvalManagerEvaluation.IUpdate;

  const updatedEvaluation: IJobPerformanceEvalManagerEvaluation =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.update(
      connection,
      {
        id: initialEvaluation.id,
        body: updateBody,
      },
    );
  typia.assert(updatedEvaluation);

  // 6. Verify updated fields
  TestValidator.equals(
    "manager id matches",
    updatedEvaluation.manager_id,
    managerAuthorized.id,
  );
  TestValidator.equals(
    "employee id matches",
    updatedEvaluation.employee_id,
    employeeAuthorized.id,
  );
  TestValidator.equals(
    "evaluation cycle id matches",
    updatedEvaluation.evaluation_cycle_id,
    evaluationCycle.id,
  );
  TestValidator.equals(
    "work performance score updated",
    updatedEvaluation.work_performance_score,
    5,
  );
  TestValidator.equals(
    "knowledge skill score updated",
    updatedEvaluation.knowledge_skill_score,
    4,
  );
  TestValidator.equals(
    "problem solving collaboration score updated",
    updatedEvaluation.problem_solving_collab_score,
    5,
  );
  TestValidator.equals(
    "innovation score updated",
    updatedEvaluation.innovation_score,
    4,
  );
  TestValidator.equals(
    "overall comment updated",
    updatedEvaluation.overall_comment,
    updatedComment,
  );
  TestValidator.predicate(
    "updated_at timestamp present",
    typeof updatedEvaluation.updated_at === "string" &&
      updatedEvaluation.updated_at.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp present",
    typeof updatedEvaluation.created_at === "string" &&
      updatedEvaluation.created_at.length > 0,
  );
}
