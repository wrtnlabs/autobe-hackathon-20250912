import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Test successful registration (join) of a new workflowManager user.
 *
 * This test validates that a new workflowManager user can register with a
 * unique valid email and hashed password. It asserts the response includes
 * a valid user ID, timestamps, and JWT authorization tokens.
 */
export async function test_api_workflow_manager_join_successful_registration(
  connection: api.IConnection,
) {
  // 1. Prepare a valid unique email for a new workflow manager user
  const email = `${RandomGenerator.alphabets(6).toLowerCase()}@example.com`;

  // 2. Prepare a password hash string (simulate)
  const password_hash = RandomGenerator.alphaNumeric(32);

  // 3. Prepare the request body according to INotificationWorkflowWorkflowManager.ICreate
  const requestBody = {
    email,
    password_hash,
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  // 4. Call the join API endpoint
  const result: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: requestBody,
    });

  // 5. Assert the response type
  typia.assert(result);

  // 6. Validate business rules
  // id is uuid
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );

  // email matches input
  TestValidator.equals("user email matches", result.email, email);

  // password_hash matches input
  TestValidator.equals(
    "user password_hash matches",
    result.password_hash,
    password_hash,
  );

  // created_at and updated_at have ISO date-time format
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result.updated_at),
  );

  // deleted_at is null for a new active user
  TestValidator.equals("deleted_at is null", result.deleted_at, null);

  // token object validation
  TestValidator.predicate(
    "token.access is string",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is string",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      result.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      result.token.refreshable_until,
    ),
  );
}
