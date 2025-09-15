import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Validate that an authenticated manager can retrieve detailed employee
 * information by ID.
 *
 * The test flow includes:
 *
 * 1. Manager user creation and authentication via the /auth/manager/join
 *    endpoint (executed twice for dependency completeness).
 * 2. Retrieval of an employee record by UUID by the authenticated manager.
 * 3. Assert validation on employee fields such as ID, email, name, and
 *    timestamps.
 *
 * This verifies both authentication and authorized data access for employee
 * detail retrieval.
 */
export async function test_api_manager_employee_retrieve_by_id_success(
  connection: api.IConnection,
) {
  // Step 1. Manager user creation and authentication (dependency call)
  const manager1: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@company.com",
        password: "strongPassword123",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager1);

  // Step 2. Repeat dependency join operation as per scenario requirements
  const manager2: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@company.com",
        password: "strongPassword123",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager2);

  // Step 3. Retrieve employee by ID - using a random UUID for test
  const employee: IJobPerformanceEvalEmployee =
    await api.functional.jobPerformanceEval.manager.employees.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(employee);

  // Step 4. Verify that employee fields are present and valid
  TestValidator.predicate(
    "employee id is a non-empty string",
    typeof employee.id === "string" && employee.id.length > 0,
  );
  TestValidator.predicate(
    "employee email contains an @ symbol",
    typeof employee.email === "string" && employee.email.includes("@"),
  );
  TestValidator.predicate(
    "employee name is a non-empty string",
    typeof employee.name === "string" && employee.name.length > 0,
  );
  TestValidator.predicate(
    "employee created_at matches ISO8601",
    typeof employee.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        employee.created_at,
      ),
  );
  TestValidator.predicate(
    "employee updated_at matches ISO8601",
    typeof employee.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        employee.updated_at,
      ),
  );
  if (employee.deleted_at !== null && employee.deleted_at !== undefined) {
    TestValidator.predicate(
      "employee deleted_at matches ISO8601 or null",
      employee.deleted_at === null ||
        (typeof employee.deleted_at === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
            employee.deleted_at,
          )),
    );
  }
}
