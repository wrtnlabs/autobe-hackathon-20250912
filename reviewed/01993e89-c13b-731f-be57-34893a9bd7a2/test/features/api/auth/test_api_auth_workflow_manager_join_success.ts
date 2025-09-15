import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Test successful creation of a new workflowManager user account with valid
 * email and password_hash.
 *
 * This test simulates the registration of a new workflowManager user by
 * providing a valid email and a hashed password string, then verifies that
 * the API returns a fully populated authorized user object along with
 * authentication tokens.
 *
 * Steps:
 *
 * 1. Generate a random valid email and a random password hash string.
 * 2. Call the api.functional.auth.workflowManager.join function with these
 *    data.
 * 3. Verify that the returned user has a valid UUID id.
 * 4. Verify that the email matches the input.
 * 5. Verify that password_hash matches the input.
 * 6. Verify that created_at and updated_at are non-null and valid date-time
 *    strings.
 * 7. Verify that deleted_at is null or undefined.
 * 8. Verify that the returned token object has all required properties:
 *    access, refresh, expired_at, and refreshable_until.
 * 9. Use typia.assert to ensure the response matches
 *    INotificationWorkflowWorkflowManager.IAuthorized exactly.
 */
export async function test_api_auth_workflow_manager_join_success(
  connection: api.IConnection,
) {
  // Step 1: Create random email and password_hash
  const email: string = typia.random<string & tags.Format<"email">>();
  const password_hash: string = RandomGenerator.alphaNumeric(64); // typical hash length

  // Step 2: Call the join API endpoint with created data
  const output: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email,
        password_hash,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });

  // Step 3: Assert the output matches the authorized DTO
  typia.assert(output);

  // Step 4: Validate returned properties
  TestValidator.predicate(
    "id is valid UUID",
    typeof output.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        output.id,
      ),
  );

  TestValidator.equals("email matches input", output.email, email);
  TestValidator.equals(
    "password_hash matches input",
    output.password_hash,
    password_hash,
  );

  TestValidator.predicate(
    "created_at is string and ISO date-time",
    typeof output.created_at === "string" &&
      !isNaN(Date.parse(output.created_at)),
  );

  TestValidator.predicate(
    "updated_at is string and ISO date-time",
    typeof output.updated_at === "string" &&
      !isNaN(Date.parse(output.updated_at)),
  );

  TestValidator.predicate(
    "deleted_at is null or undefined",
    output.deleted_at === null || output.deleted_at === undefined,
  );

  // Validate token fields
  TestValidator.predicate(
    "token is object",
    typeof output.token === "object" && output.token !== null,
  );

  TestValidator.predicate(
    "token.access is string",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is string",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is string and ISO date-time",
    typeof output.token.expired_at === "string" &&
      !isNaN(Date.parse(output.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is string and ISO date-time",
    typeof output.token.refreshable_until === "string" &&
      !isNaN(Date.parse(output.token.refreshable_until)),
  );
}
