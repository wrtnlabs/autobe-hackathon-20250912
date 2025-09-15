import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

/**
 * Validate unauthorized access is rejected when creating a self-evaluation.
 *
 * Business context: Only authenticated employees are authorized to create
 * self-evaluations. Attempting to create a self-evaluation without
 * authentication must fail.
 *
 * Workflow:
 *
 * 1. Prepare by creating an employee account (join operation) to ensure valid user
 *    exists.
 * 2. Attempt to create a self-evaluation without authentication tokens.
 * 3. Verify the API call fails with expected authorization error.
 */
export async function test_api_self_evaluation_create_unauthorized_error(
  connection: api.IConnection,
) {
  // Step 1: Create an employee user to setup an authentically valid account
  const employeeCreateBody = {
    email: `unauthorized.user.${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  await api.functional.auth.employee.join.joinEmployee(connection, {
    body: employeeCreateBody,
  });

  // Step 2: Prepare a realistic self-evaluation creation request body
  const currentDateISOString = new Date().toISOString();
  const selfEvaluationBody = {
    evaluation_cycle_id: typia.random<string & tags.Format<"uuid">>(),
    evaluation_date: currentDateISOString,
    work_performance_score: (Math.floor(Math.random() * 5) +
      1) satisfies number,
    knowledge_skill_score: (Math.floor(Math.random() * 5) + 1) satisfies number,
    problem_solving_collab_score: (Math.floor(Math.random() * 5) +
      1) satisfies number,
    innovation_score: (Math.floor(Math.random() * 5) + 1) satisfies number,
    overall_comment: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IJobPerformanceEvalSelfEvaluation.ICreate;

  // Step 3: Prepare an unauthenticated connection object (empty headers to disable auth)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Attempt to create self-evaluation without authentication, expecting an error
  await TestValidator.error(
    "Creating self-evaluation without authentication should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.selfEvaluations.create(
        unauthenticatedConnection,
        { body: selfEvaluationBody },
      );
    },
  );
}
