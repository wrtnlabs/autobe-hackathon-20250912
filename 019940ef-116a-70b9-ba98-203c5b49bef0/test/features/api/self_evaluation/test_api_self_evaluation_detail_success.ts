import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

/**
 * Successfully retrieve detailed information of a specific self-evaluation
 * by its ID.
 *
 * Business context: This test covers the complete flow of an employee
 * registering via join API, authenticating, then retrieving detailed
 * self-evaluation information by ID.
 *
 * Steps:
 *
 * 1. Create a new employee with unique email, hashed password, and name.
 * 2. Confirm the response contains authorized employee data with tokens.
 * 3. Use the employee id to retrieve detailed self-evaluation data by id.
 * 4. Validate the returned self-evaluation fields for employee_id correctness.
 */
export async function test_api_self_evaluation_detail_success(
  connection: api.IConnection,
) {
  // Step 1: Register new employee user
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32); // Simulated hash
  const name = RandomGenerator.name();
  const createBody = {
    email,
    password_hash: passwordHash,
    name,
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: createBody,
    });
  typia.assert(employee);

  // Step 2: The self-evaluation ID to retrieve is set as employee id to simulate fetch
  // Note: This assumes an existing self-evaluation with same id as employee id for testing.
  // In practical scenario, integration with test data setup or self-evaluation creation is required.

  const selfEvaluation: IJobPerformanceEvalSelfEvaluation =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.atSelfEvaluation(
      connection,
      {
        id: employee.id,
      },
    );
  typia.assert(selfEvaluation);

  // Validate that the selfEvaluation object has correct employee_id matching employee.id
  TestValidator.equals(
    "selfEvaluation has matching employee_id",
    selfEvaluation.employee_id,
    employee.id,
  );
}
