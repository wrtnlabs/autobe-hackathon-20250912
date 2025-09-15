import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";

/**
 * This test scenario verifies the successful update of an existing employee's
 * information using the PUT /jobPerformanceEval/employee/employees/{id} API. It
 * starts by creating a new employee with POST /auth/employee/join to obtain a
 * valid employee ID and authenticated session. Then, it updates the employee's
 * email, password_hash, and name fields with new values. The test asserts that
 * the update response matches the modified data exactly, confirming that the
 * employee's info is updated correctly. This scenario tests the employee role
 * with proper authorization, valid inputs, and full response validation using
 * typia.assert.
 *
 * Step-by-step process:
 *
 * 1. Create a new employee account via POST /auth/employee/join with random but
 *    valid email, password_hash, and name.
 * 2. Confirm creation by asserting the authorized employee response.
 * 3. Update the created employee using PUT
 *    /jobPerformanceEval/employee/employees/{id} with new values for email,
 *    password_hash, and name.
 * 4. Assert the update response contains all updated fields correctly reflecting
 *    the change.
 * 5. Validate all response structures strictly with typia.assert to ensure no
 *    schema violations.
 *
 * The test uses RandomGenerator and typia to generate realistic random strings,
 * emails, UUIDs, and date-time strings to fulfill properties and constraints.
 * It switches authentication context by calling the join operation that sets
 * the Authorization header automatically. It avoids any unauthorized or invalid
 * type requests and respects all nullability and required constraints in DTOs.
 */
export async function test_api_employee_update_success(
  connection: api.IConnection,
) {
  // 1. Create new employee via join API
  const createBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const authorized: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Prepare updated info
  const updateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@update.com",
    password_hash: RandomGenerator.alphaNumeric(25),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.IUpdate;

  // 3. Update the employee's data
  const updated: IJobPerformanceEvalEmployee =
    await api.functional.jobPerformanceEval.employee.employees.update(
      connection,
      {
        id: authorized.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate updated fields
  TestValidator.equals(
    "employee id should not change",
    updated.id,
    authorized.id,
  );
  TestValidator.equals(
    "employee email should be updated",
    updated.email,
    updateBody.email,
  );
  TestValidator.equals(
    "employee password_hash should be updated",
    updated.password_hash,
    updateBody.password_hash,
  );
  TestValidator.equals(
    "employee name should be updated",
    updated.name,
    updateBody.name,
  );
}
