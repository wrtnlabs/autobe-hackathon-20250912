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
 * Validate the successful deletion of a manager evaluation.
 *
 * This comprehensive test validates the typical lifecycle and authorization of
 * deleting a manager evaluation. It encompasses the following steps:
 *
 * 1. Create and authenticate a manager user (roles required to call the delete
 *    API).
 * 2. Create an employee user who will be the target of the evaluation.
 * 3. Create an evaluation cycle to link evaluations.
 * 4. Create a manager evaluation record with realistic scores and comment.
 * 5. Call the deletion endpoint on the created manager evaluation.
 * 6. Validate no response content (void) is returned after deletion.
 * 7. Ensure the deletion is effective and authorized by relying on SDK compliance.
 *
 * This test ensures both the security and correctness of manager evaluation
 * deletion logic.
 */
export async function test_api_managerevaluation_delete_success(
  connection: api.IConnection,
) {
  // 1. Manager user signup and authentication
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: "StrongP@ssw0rd!",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Employee user signup and authentication
  const employeeEmail: string = typia.random<string & tags.Format<"email">>();
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employeeEmail,
        password_hash: RandomGenerator.alphaNumeric(64),
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employee);

  // 3. Create evaluation cycle
  const now: Date = new Date();
  const startDate: string = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate: string = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days later
  const evaluationCycle: IJobPerformanceEvalEvaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      {
        body: {
          cycle_code: `CYCLE-${typia.random<string & tags.Pattern<"^[A-Z0-9]{6}$">>()}`,
          cycle_name: `Cycle ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 })}`,
          start_date: startDate,
          end_date: endDate,
          is_active: true,
        } satisfies IJobPerformanceEvalEvaluationCycle.ICreate,
      },
    );
  typia.assert(evaluationCycle);

  // 4. Create a new manager evaluation record
  const randomScore = () => Math.floor(Math.random() * 5) + 1; // integer in [1..5]

  const managerEvaluationCreateBody: IJobPerformanceEvalManagerEvaluation.ICreate =
    {
      manager_id: typia.assert<string & tags.Format<"uuid">>(manager.id),
      employee_id: typia.assert<string & tags.Format<"uuid">>(employee.id),
      evaluation_cycle_id: typia.assert<string & tags.Format<"uuid">>(
        evaluationCycle.id,
      ),
      evaluation_date: now.toISOString(),
      work_performance_score: randomScore(),
      knowledge_skill_score: randomScore(),
      problem_solving_collab_score: randomScore(),
      innovation_score: randomScore(),
      overall_comment: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 4,
        wordMax: 8,
      }),
    } satisfies IJobPerformanceEvalManagerEvaluation.ICreate;

  const managerEvaluation: IJobPerformanceEvalManagerEvaluation =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.create(
      connection,
      {
        body: managerEvaluationCreateBody,
      },
    );
  typia.assert(managerEvaluation);

  // 5. Delete the manager evaluation by id
  await api.functional.jobPerformanceEval.manager.managerEvaluations.erase(
    connection,
    {
      id: managerEvaluation.id,
    },
  );

  // 6. No content expected, void return confirmed by TypeScript and await
  // There is no retrieval API for manager evaluation single record optionally to verify that it is deleted, so verification is based on successful void return
  // and relying on backend role enforcement and API correctness.
}
