import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * This test validates the successful registration of a workflowManager
 * user.
 *
 * It performs the complete happy path of creating a user by providing a
 * unique email and a hashed password. The test verifies that the returned
 * authorized user data includes a valid UUID as the user ID, correct email,
 * password hash, valid timestamp fields (created_at, updated_at), and
 * optional deletion date.
 *
 * Additionally, it validates the returned JWT token structure with access
 * and refresh tokens, including expiration and refresh time ISO date-time
 * strings.
 *
 * The test uses random data for input with proper type assertion and
 * comprehensive validation of response data.
 *
 * Steps:
 *
 * 1. Generate a random email and password hash for user creation.
 * 2. Execute the join API to register the workflowManager user.
 * 3. Assert the response data with typia.assert to ensure schema compliance.
 * 4. Verify UUID format of user ID.
 * 5. Check email matches input.
 * 6. Confirm password hash is non-empty.
 * 7. Validate timestamp fields as proper ISO date strings.
 * 8. Accept explicit null or parseable deletion timestamp.
 * 9. Validate the token object fields for string presence and valid dates.
 */
export async function test_api_auth_workflowmanager_join_success(
  connection: api.IConnection,
) {
  // Generate realistic unique email
  const email: string = `${RandomGenerator.alphaNumeric(8)}@example.com`;

  // Generate realistic password hash string
  const passwordHash: string = RandomGenerator.alphaNumeric(32);

  // Prepare request body for user creation
  const requestBody = {
    email: email,
    password_hash: passwordHash,
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  // Call the join API
  const response: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: requestBody,
    });

  // Assert the response data type and structure
  typia.assert(response);

  // Validate user ID is a valid UUID
  TestValidator.predicate(
    "Valid UUID for user id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );

  // Check the returned email matches input
  TestValidator.equals("Returned email matches input", response.email, email);

  // Password hash is a non-empty string
  TestValidator.predicate(
    "Password hash is non-empty string",
    typeof response.password_hash === "string" &&
      response.password_hash.length > 0,
  );

  // created_at and updated_at values are valid date-time strings
  TestValidator.predicate(
    "created_at is ISO date-time string",
    !isNaN(Date.parse(response.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    !isNaN(Date.parse(response.updated_at)),
  );

  // deleted_at can be null or parseable date-time string if present
  if (response.deleted_at !== null && response.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO date-time string if present",
      !isNaN(Date.parse(response.deleted_at)),
    );
  }

  // Validate token object fields
  const token: IAuthorizationToken = response.token;
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO date-time string",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time string",
    !isNaN(Date.parse(token.refreshable_until)),
  );
}
