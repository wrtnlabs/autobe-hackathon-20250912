import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";

/**
 * Test JWT token refresh functionality for an authenticated admin user.
 *
 * This test validates the complete flow of JWT token management for an admin
 * user in the chatbot admin system. It covers the entire lifecycle from admin
 * account creation (join) to login, token refresh, and error handling.
 *
 * The test steps include:
 *
 * 1. Create a new admin user successfully via the join API
 * 2. Login as the admin user to obtain initial tokens
 * 3. Use the refresh API with the valid refresh token to obtain new tokens
 * 4. Validate returned refreshed tokens and authorization data
 * 5. Test error handling when invalid or expired tokens are provided to the
 *    refresh endpoint
 */
export async function test_api_admin_token_refresh_successful(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;

  const createdAdmin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(createdAdmin);

  // 2. Login as the created admin to obtain valid tokens
  const adminLoginBody = {
    internal_sender_id: createdAdmin.internal_sender_id,
    nickname: createdAdmin.nickname,
  } satisfies IChatbotAdmin.ILogin;

  const loggedInAdmin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedInAdmin);

  // Validate initial tokens presence
  TestValidator.predicate(
    "Initial access token exists",
    typeof loggedInAdmin.token.access === "string" &&
      loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "Initial refresh token exists",
    typeof loggedInAdmin.token.refresh === "string" &&
      loggedInAdmin.token.refresh.length > 0,
  );

  // 3. Refresh tokens using the refresh token
  const refreshInput = {
    refresh_token: loggedInAdmin.token.refresh,
  } satisfies IChatbotAdmin.IRefresh;

  const refreshedTokens: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: refreshInput });
  typia.assert(refreshedTokens);

  // Validate refreshed tokens differ from initial tokens
  TestValidator.notEquals(
    "Refreshed access token differs",
    refreshedTokens.token.access,
    loggedInAdmin.token.access,
  );
  TestValidator.notEquals(
    "Refreshed refresh token differs",
    refreshedTokens.token.refresh,
    loggedInAdmin.token.refresh,
  );

  // Validate that refreshed admin properties match original
  TestValidator.equals(
    "Admin ID remains same after refresh",
    refreshedTokens.id,
    loggedInAdmin.id,
  );
  TestValidator.equals(
    "Admin internal_sender_id remains same after refresh",
    refreshedTokens.internal_sender_id,
    loggedInAdmin.internal_sender_id,
  );
  TestValidator.equals(
    "Admin nickname remains same after refresh",
    refreshedTokens.nickname,
    loggedInAdmin.nickname,
  );

  // 4. Test error handling for invalid refresh token
  await TestValidator.error(
    "Refresh with invalid token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "invalidtoken1234567890",
        } satisfies IChatbotAdmin.IRefresh,
      });
    },
  );

  // 5. (Optional) Test error handling for expired token if possible
  // Since we can't artificially expire tokens, we skip exact expired token test
  // but we can simulate another invalid token scenario
  await TestValidator.error(
    "Refresh with empty token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: { refresh_token: "" } satisfies IChatbotAdmin.IRefresh,
      });
    },
  );
}
