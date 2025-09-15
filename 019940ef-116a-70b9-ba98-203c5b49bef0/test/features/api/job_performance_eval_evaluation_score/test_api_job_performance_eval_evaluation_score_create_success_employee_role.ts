import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";

/**
 * End-to-end test for job performance evaluation score creation by an
 * employee user.
 *
 * Validates entire workflow:
 *
 * 1. Employee user signs up with unique email and hashed password.
 * 2. Employee user logs in to obtain authentication tokens.
 * 3. Authenticated employee creates a new evaluation score.
 * 4. Validates response for exact property presence and correctness.
 *
 * The test generates realistic data conforming to UUID, string, and integer
 * constraints, and verifies the returned evaluation score record has
 * expected structure and values.
 */
export async function test_api_job_performance_eval_evaluation_score_create_success_employee_role(
  connection: api.IConnection,
) {
  // 1. Employee joins
  const employeeCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@company.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // 2. Employee logs in
  const employeeLoginBody = {
    email: employeeCreateBody.email,
    password: "dummy-password",
  } satisfies IJobPerformanceEvalEmployee.ILogin;
  const loginRes: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.login.loginEmployee(connection, {
      body: employeeLoginBody,
    });
  typia.assert(loginRes);

  // 3. Create evaluation score
  const evaluationScoreCreateBody = {
    evaluation_id: typia.random<string & tags.Format<"uuid">>(),
    category: "work_performance",
    score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
  } satisfies IJobPerformanceEvalEvaluationScore.ICreate;
  const evaluationScore: IJobPerformanceEvalEvaluationScore =
    await api.functional.jobPerformanceEval.employee.evaluationScores.create(
      connection,
      {
        body: evaluationScoreCreateBody,
      },
    );
  typia.assert(evaluationScore);

  // 4. Assertions
  TestValidator.equals(
    "evaluationScore.evaluation_id matches",
    evaluationScore.evaluation_id,
    evaluationScoreCreateBody.evaluation_id,
  );
  TestValidator.equals(
    "evaluationScore.category matches",
    evaluationScore.category,
    evaluationScoreCreateBody.category,
  );
  TestValidator.equals(
    "evaluationScore.score matches",
    evaluationScore.score,
    evaluationScoreCreateBody.score,
  );
  TestValidator.predicate(
    "evaluationScore.id is uuid format",
    typeof evaluationScore.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        evaluationScore.id,
      ),
  );
  TestValidator.predicate(
    "evaluationScore.created_at is ISO date-time format",
    typeof evaluationScore.created_at === "string" &&
      !isNaN(Date.parse(evaluationScore.created_at)),
  );
  TestValidator.predicate(
    "evaluationScore.updated_at is ISO date-time format",
    typeof evaluationScore.updated_at === "string" &&
      !isNaN(Date.parse(evaluationScore.updated_at)),
  );
}
