import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";

/**
 * Test successful registration of a new employee user with valid email, hashed
 * password, and name. Confirm that the API returns proper JWT tokens for
 * authentication. Also test attempts to register a user with duplicate email to
 * verify uniqueness constraint enforcement.
 */
export async function test_api_employee_join_success_and_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Generate a valid employee create request body
  const employeeCreate: IJobPerformanceEvalEmployee.ICreate = {
    email: `${RandomGenerator.name(1).toLowerCase()}${RandomGenerator.alphaNumeric(4)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32), // Simulated hashed password
    name: RandomGenerator.name(),
  };

  // Step 2: Call joinEmployee API for successful registration
  const authorized: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreate,
    });
  typia.assert(authorized);

  // Step 3: Validate tokens presence
  TestValidator.predicate(
    "access token present",
    authorized.access_token !== undefined && authorized.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    authorized.refresh_token !== undefined &&
      authorized.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "token object present",
    authorized.token !== undefined,
  );
  TestValidator.predicate(
    "token access string present",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh string present",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at string present",
    typeof authorized.token.expired_at === "string" &&
      authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until string present",
    typeof authorized.token.refreshable_until === "string" &&
      authorized.token.refreshable_until.length > 0,
  );

  // Step 4: Attempt to register with duplicate email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.employee.join.joinEmployee(connection, {
        body: {
          ...employeeCreate,
        },
      });
    },
  );
}
