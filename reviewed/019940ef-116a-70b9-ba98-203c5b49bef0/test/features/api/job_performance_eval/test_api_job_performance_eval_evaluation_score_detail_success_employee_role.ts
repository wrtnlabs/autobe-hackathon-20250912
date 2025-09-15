import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";

/**
 * Validates successful retrieval of a job performance evaluation score
 * detail by an authenticated employee user.
 *
 * This test covers the following business workflow:
 *
 * 1. Employee user is created using the join API with valid credentials.
 * 2. The same employee user logs in to obtain authorization tokens.
 * 3. Using the authenticated session, a job performance evaluation score is
 *    retrieved by its unique ID.
 * 4. The test asserts the evaluation score's ID matches the requested ID and
 *    validates full response structure correctness.
 *
 * The scenario ensures that an employee role has proper access rights to
 * read evaluation score details and that the API data adheres strictly to
 * the defined DTO schemas.
 */
export async function test_api_job_performance_eval_evaluation_score_detail_success_employee_role(
  connection: api.IConnection,
) {
  // 1. Create employee user by joining
  const employeeCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const createdEmployee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(createdEmployee);

  // 2. Log in as the created employee user
  const loginBody = {
    email: createdEmployee.email,
    password: employeeCreateBody.password_hash,
  } satisfies IJobPerformanceEvalEmployee.ILogin;
  const loggedInEmployee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.login.loginEmployee(connection, {
      body: loginBody,
    });
  typia.assert(loggedInEmployee);

  // 3. Query evaluation score detail using a valid id
  const validEvaluationScoreId = typia.random<string & tags.Format<"uuid">>();
  const evaluationScore: IJobPerformanceEvalEvaluationScore =
    await api.functional.jobPerformanceEval.employee.evaluationScores.at(
      connection,
      { id: validEvaluationScoreId },
    );
  typia.assert(evaluationScore);

  // 4. Confirm the returned evaluation score id matches the requested id
  TestValidator.equals(
    "evaluation score id",
    evaluationScore.id,
    validEvaluationScoreId,
  );
}
