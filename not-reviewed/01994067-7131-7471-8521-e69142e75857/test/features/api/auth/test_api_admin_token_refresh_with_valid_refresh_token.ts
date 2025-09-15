import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";

export async function test_api_admin_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Join a new admin user to obtain initial tokens
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: "strong-password-123",
  } satisfies IOauthServerAdmin.ICreate;

  const joinResponse: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(joinResponse);

  // Check the initial tokens exist and are strings
  TestValidator.predicate(
    "Initial access token exists",
    typeof joinResponse.token.access === "string",
  );
  TestValidator.predicate(
    "Initial refresh token exists",
    typeof joinResponse.token.refresh === "string",
  );

  // Step 2: Use the refresh token to get new tokens
  const refreshBody = {
    refresh_token: joinResponse.token.refresh,
  } satisfies IOauthServerAdmin.IRefresh;

  const refreshResponse: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: refreshBody });
  typia.assert(refreshResponse);

  // Validate refreshed token strings
  TestValidator.predicate(
    "Refreshed access token exists",
    typeof refreshResponse.token.access === "string",
  );
  TestValidator.predicate(
    "Refreshed refresh token exists",
    typeof refreshResponse.token.refresh === "string",
  );

  // Validate user properties remain consistent
  TestValidator.equals(
    "Admin ID remains unchanged",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "Admin email remains unchanged",
    refreshResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "Email verified flag remains unchanged",
    refreshResponse.email_verified,
    joinResponse.email_verified,
  );

  // Validate expiration dates are ISO strings
  TestValidator.predicate(
    "Access token expiration is string",
    typeof refreshResponse.token.expired_at === "string",
  );
  TestValidator.predicate(
    "Refresh token expiration is string",
    typeof refreshResponse.token.refreshable_until === "string",
  );
}
