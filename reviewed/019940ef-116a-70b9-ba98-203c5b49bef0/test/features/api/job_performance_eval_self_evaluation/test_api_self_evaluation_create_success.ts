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
 * This test validates the successful creation of a self-evaluation record
 * by an employee.
 *
 * The flow includes:
 *
 * 1. Employee creation with randomly generated email, plaintext password, and
 *    name. The password_hash is set to the plaintext password to simulate
 *    hash due to no hashing function.
 * 2. Manager creation and login to create an evaluation cycle with unique code
 *    and valid dates.
 * 3. Role switching to employee login using the same plaintext password for
 *    authentication.
 * 4. Creation of a self-evaluation referencing the evaluation cycle and
 *    containing valid scores and comment.
 * 5. Validation that the created self-evaluation matches expected employee and
 *    cycle IDs and scores are within valid ranges.
 */
export async function test_api_self_evaluation_create_success(
  connection: api.IConnection,
) {
  // 1. Create a new Employee user and authenticate
  const employeePassword = RandomGenerator.alphaNumeric(16); // plaintext password
  const employeeCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
    password_hash: employeePassword, // using plaintext as hash for test due to no hashing utility
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employeeAuth = await api.functional.auth.employee.join.joinEmployee(
    connection,
    {
      body: employeeCreateBody,
    },
  );
  typia.assert(employeeAuth);

  // 2. Create a new Manager user and authenticate
  const managerPassword = RandomGenerator.alphaNumeric(16); // plaintext password
  const managerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
    password: managerPassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuth = await api.functional.auth.manager.join(connection, {
    body: managerCreateBody,
  });
  typia.assert(managerAuth);

  await api.functional.auth.manager.login(connection, {
    body: {
      email: managerCreateBody.email,
      password: managerPassword,
    } satisfies IJobPerformanceEvalManager.ILogin,
  });

  // 3. Create a new evaluation cycle with valid dates
  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const cycleCreateBody = {
    cycle_code: `CYCLE${Date.now()}`,
    cycle_name: `Test Cycle ${RandomGenerator.name(1)}`,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.ICreate;

  const evaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      { body: cycleCreateBody },
    );
  typia.assert(evaluationCycle);

  // 4. Employee login to switch role
  await api.functional.auth.employee.login.loginEmployee(connection, {
    body: {
      email: employeeCreateBody.email,
      password: employeePassword,
    } satisfies IJobPerformanceEvalEmployee.ILogin,
  });

  // 5. Create a self-evaluation referencing the evaluation cycle
  const selfEvaluationCreateBody = {
    evaluation_cycle_id: evaluationCycle.id,
    evaluation_date: new Date().toISOString(),
    work_performance_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    knowledge_skill_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    problem_solving_collab_score: RandomGenerator.pick([
      1, 2, 3, 4, 5,
    ] as const),
    innovation_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    overall_comment: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IJobPerformanceEvalSelfEvaluation.ICreate;

  const selfEvaluation =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.create(
      connection,
      { body: selfEvaluationCreateBody },
    );
  typia.assert(selfEvaluation);

  // 6. Validate fields
  TestValidator.equals(
    "employee_id matches authenticated employee id",
    selfEvaluation.employee_id,
    employeeAuth.id,
  );
  TestValidator.equals(
    "evaluation_cycle_id matches created cycle id",
    selfEvaluation.evaluation_cycle_id,
    evaluationCycle.id,
  );
  TestValidator.predicate(
    "work_performance_score in valid range",
    selfEvaluation.work_performance_score >= 1 &&
      selfEvaluation.work_performance_score <= 5,
  );
  TestValidator.predicate(
    "knowledge_skill_score in valid range",
    selfEvaluation.knowledge_skill_score >= 1 &&
      selfEvaluation.knowledge_skill_score <= 5,
  );
  TestValidator.predicate(
    "problem_solving_collab_score in valid range",
    selfEvaluation.problem_solving_collab_score >= 1 &&
      selfEvaluation.problem_solving_collab_score <= 5,
  );
  TestValidator.predicate(
    "innovation_score in valid range",
    selfEvaluation.innovation_score >= 1 &&
      selfEvaluation.innovation_score <= 5,
  );
  TestValidator.predicate(
    "overall_comment is non-empty string",
    typeof selfEvaluation.overall_comment === "string" &&
      selfEvaluation.overall_comment.length > 0,
  );
}
