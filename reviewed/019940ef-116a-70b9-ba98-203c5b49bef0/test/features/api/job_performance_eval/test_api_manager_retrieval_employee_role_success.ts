import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test successful fetching of a manager by ID as an authenticated employee
 * user.
 *
 * This test validates the positive scenario where a newly joined employee
 * authenticates and then retrieves manager details using a valid UUID
 * manager ID.
 *
 * It ensures the join operation correctly returns tokens, which are used to
 * authorize the subsequent GET operation for manager information.
 *
 * The test covers the full flow from employee registration to authorized
 * data fetching, including type validation and correctness of returned
 * data.
 */
export async function test_api_manager_retrieval_employee_role_success(
  connection: api.IConnection,
) {
  // 1. Employee joins and authenticates
  const employeeCreateBody = {
    email: `employee_${RandomGenerator.alphaNumeric(8)}@company.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employeeAuth = await api.functional.auth.employee.join.joinEmployee(
    connection,
    { body: employeeCreateBody },
  );
  typia.assert(employeeAuth);

  // 2. Fetch manager by a random manager id (uuid) while authenticated as the employee
  const managerId = typia.random<string & tags.Format<"uuid">>();

  const manager = await api.functional.jobPerformanceEval.employee.managers.at(
    connection,
    { id: managerId },
  );
  typia.assert(manager);

  // 3. Validate that the fetched manager id equals the requested id
  TestValidator.equals(
    "fetched manager id should match requested id",
    manager.id,
    managerId,
  );
}
