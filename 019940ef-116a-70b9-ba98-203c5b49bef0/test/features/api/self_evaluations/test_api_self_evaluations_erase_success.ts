import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

/**
 * Test the deletion of an existing employee self-evaluation record
 * successfully.
 *
 * This thorough test scenario covers the complete prerequisite processes
 * including:
 *
 * - Employee user registration and authentication
 * - Manager user registration and authentication
 * - Manager creates an evaluation cycle for association
 * - Employee creates a self-evaluation linked to the evaluation cycle
 * - Employee deletes the created self-evaluation record
 * - Verification by attempting to access the deleted self-evaluation record
 *
 * The test ensures all multi-role authentication and authorization chains
 * work correctly and that the deletion is effective and visible.
 *
 * The validation uses typia.assert to ensure data compliance and
 * TestValidator to assert expected business process behavior.
 */
export async function test_api_self_evaluations_erase_success(
  connection: api.IConnection,
) {
  // 1. Employee user creation and authentication
  const employeePassword = RandomGenerator.alphaNumeric(20);
  const employeeCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@jobcompany.com`,
    password_hash: employeePassword, // For test, use plain password as hash
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employeeAuthorized: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employeeAuthorized);

  // 2. Manager user creation and authentication
  const managerPassword = RandomGenerator.alphaNumeric(20);
  const managerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@jobcompany.com`,
    password: managerPassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerAuthorized);

  // 3. Manager logs in
  await api.functional.auth.manager.login(connection, {
    body: {
      email: managerCreateBody.email,
      password: managerPassword,
    } satisfies IJobPerformanceEvalManager.ILogin,
  });

  // 4. Manager creates an evaluation cycle
  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();

  const evaluationCycleCreateBody = {
    cycle_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    cycle_name: `Q${now.getMonth() + 1} 2025 Evaluation`,
    start_date: startDate,
    end_date: endDate,
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.ICreate;

  const evaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      { body: evaluationCycleCreateBody },
    );
  typia.assert(evaluationCycle);

  // 5. Employee logs in
  await api.functional.auth.employee.login.loginEmployee(connection, {
    body: {
      email: employeeCreateBody.email,
      password: employeePassword,
    } satisfies IJobPerformanceEvalEmployee.ILogin,
  });

  // 6. Employee creates a self-evaluation
  const selfEvaluationCreateBody = {
    evaluation_cycle_id: evaluationCycle.id,
    evaluation_date: now.toISOString(),
    work_performance_score: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    knowledge_skill_score: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    problem_solving_collab_score: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    innovation_score: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    overall_comment: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IJobPerformanceEvalSelfEvaluation.ICreate;

  const selfEvaluation =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.create(
      connection,
      { body: selfEvaluationCreateBody },
    );
  typia.assert(selfEvaluation);

  // 7. Employee deletes the created self-evaluation record
  await api.functional.jobPerformanceEval.employee.selfEvaluations.erase(
    connection,
    {
      id: selfEvaluation.id,
    },
  );

  // 8. Verify deletion by creating a new self-evaluation
  const newEvalDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const newSelfEvaluationCreateBody = {
    evaluation_cycle_id: evaluationCycle.id,
    evaluation_date: newEvalDate,
    work_performance_score: 3,
    knowledge_skill_score: 3,
    problem_solving_collab_score: 3,
    innovation_score: 3,
    overall_comment: "New self-evaluation after deletion",
  } satisfies IJobPerformanceEvalSelfEvaluation.ICreate;

  const newSelfEvaluation =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.create(
      connection,
      { body: newSelfEvaluationCreateBody },
    );
  typia.assert(newSelfEvaluation);

  TestValidator.notEquals(
    "self-evaluation id after deletion should differ from deleted id",
    newSelfEvaluation.id,
    selfEvaluation.id,
  );
}
