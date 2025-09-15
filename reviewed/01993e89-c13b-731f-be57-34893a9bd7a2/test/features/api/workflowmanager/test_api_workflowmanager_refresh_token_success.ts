import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Test refreshing JWT tokens for a workflowManager user to ensure session
 * continuity.
 *
 * This test creates a new workflowManager user by registering with a
 * realistic email and password hash via the join API. It then calls the
 * refresh API using the refresh token from the join response to verify that
 * new access and refresh tokens are correctly issued. The test asserts that
 * token values are updated and all relevant properties on the user object
 * are valid and consistent.
 *
 * The test ensures the refresh endpoint successfully maintains session
 * continuity for the workflowManager role with valid authentication
 * tokens.
 *
 * Steps:
 *
 * 1. Register a new workflowManager user using the join API.
 * 2. Validate the returned user data including token fields.
 * 3. Call the refresh API with the received refresh token.
 * 4. Validate that refreshed tokens and user data are correctly issued.
 *
 * @param connection API connection context
 */
export async function test_api_workflowmanager_refresh_token_success(
  connection: api.IConnection,
) {
  // 1. Generate user registration data
  const userEmail: string = `${RandomGenerator.name(1).toLowerCase()}${typia.random<string & tags.Pattern<"^[0-9]{4}$">>()}@example.com`;
  const passwordHash: string = RandomGenerator.alphaNumeric(64); // simulate hashed password
  const createBody = {
    email: userEmail,
    password_hash: passwordHash,
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  // 2. Call join endpoint to register workflowManager user
  const joinedUser: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: createBody,
    });
  typia.assert(joinedUser);

  // 3. Validate joinedUser properties
  TestValidator.predicate(
    "joinedUser.id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      joinedUser.id,
    ),
  );
  TestValidator.equals(
    "joinedUser.email matches input",
    joinedUser.email,
    userEmail,
  );
  TestValidator.equals(
    "joinedUser.password_hash matches input",
    joinedUser.password_hash,
    passwordHash,
  );
  TestValidator.predicate(
    "joinedUser.created_at is ISO 8601",
    typeof joinedUser.created_at === "string" &&
      joinedUser.created_at.length > 10,
  );
  TestValidator.predicate(
    "joinedUser.updated_at is ISO 8601",
    typeof joinedUser.updated_at === "string" &&
      joinedUser.updated_at.length > 10,
  );
  TestValidator.predicate(
    "joinedUser.token.access is non-empty string",
    typeof joinedUser.token.access === "string" &&
      joinedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "joinedUser.token.refresh is non-empty string",
    typeof joinedUser.token.refresh === "string" &&
      joinedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "joinedUser.token.expired_at is ISO 8601",
    typeof joinedUser.token.expired_at === "string" &&
      joinedUser.token.expired_at.length > 10,
  );
  TestValidator.predicate(
    "joinedUser.token.refreshable_until is ISO 8601",
    typeof joinedUser.token.refreshable_until === "string" &&
      joinedUser.token.refreshable_until.length > 10,
  );

  // 4. Call refresh endpoint with refresh token
  const refreshBody = {
    refresh_token: joinedUser.token.refresh,
  } satisfies INotificationWorkflowWorkflowManager.IRefresh;
  const refreshedUser: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedUser);

  // 5. Validate refreshed user properties
  TestValidator.predicate(
    "refreshedUser.id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      refreshedUser.id,
    ),
  );
  TestValidator.equals(
    "refreshedUser.email matches joinedUser.email",
    refreshedUser.email,
    joinedUser.email,
  );
  TestValidator.notEquals(
    "refreshedUser.token.access is new token",
    refreshedUser.token.access,
    joinedUser.token.access,
  );
  TestValidator.notEquals(
    "refreshedUser.token.refresh is new token",
    refreshedUser.token.refresh,
    joinedUser.token.refresh,
  );
  TestValidator.predicate(
    "refreshedUser.token.expired_at is ISO 8601",
    typeof refreshedUser.token.expired_at === "string" &&
      refreshedUser.token.expired_at.length > 10,
  );
  TestValidator.predicate(
    "refreshedUser.token.refreshable_until is ISO 8601",
    typeof refreshedUser.token.refreshable_until === "string" &&
      refreshedUser.token.refreshable_until.length > 10,
  );
}
