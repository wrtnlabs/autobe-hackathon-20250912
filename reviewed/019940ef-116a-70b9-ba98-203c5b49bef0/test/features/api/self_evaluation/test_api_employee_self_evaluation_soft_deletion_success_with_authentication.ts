import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";

/**
 * Test soft deletion of an existing self-evaluation record by an
 * authenticated employee.
 *
 * The test performs the following steps:
 *
 * 1. Employee signs up and authenticates using the join API.
 * 2. Simulates creation of a self-evaluation record by generating a random
 *    UUID.
 * 3. Deletes the self-evaluation record softly using the delete API.
 * 4. Verifies that the delete operation completes successfully without errors.
 *
 * Note: Due to lack of a self-evaluation read API, the test cannot verify
 * the deleted state beyond successful deletion call.
 *
 * Authentication tokens are automatically managed by the API client.
 */
export async function test_api_employee_self_evaluation_soft_deletion_success_with_authentication(
  connection: api.IConnection,
) {
  // 1. Employee joins and authenticates
  const employeeCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employeeAuthorized: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employeeAuthorized);

  // 2. Simulate a self-evaluation record ID to be deleted
  const selfEvaluationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Soft delete the self-evaluation record
  await api.functional.jobPerformanceEval.employee.selfEvaluations.erase(
    connection,
    { id: selfEvaluationId },
  );

  // 4. The API returns no content on successful deletion; no further checks possible
}
