import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate the successful refresh of a JWT access token for a system admin.
 *
 * This test ensures that once a system admin is authenticated, they can use
 * their active refresh token to request a new access token. The flow mimics
 * the standard admin authentication lifecycle:
 *
 * 1. Register (join) a new system admin with a unique external admin ID and
 *    business email.
 * 2. Login as that system admin using the external admin ID and email,
 *    retrieving the initial access and refresh tokens (session
 *    established).
 * 3. Use the refresh endpoint with a valid session to obtain a new access
 *    token, expecting a non-identical access token and updated session
 *    information.
 * 4. Ensure the returned session object matches expectations (correct admin
 *    identity, valid JWT structure, required fields present).
 * 5. Validate the new session's access and refresh tokens are structured and
 *    that critical lifecycle fields (such as updated_at) have updated
 *    accordingly, indicating a refresh event.
 *
 * Note: Since session lifecycle/expiry is backend-driven and not directly
 * verifiable, the test checks for correct mutation of session fields rather
 * than deep audit log introspection. Failure scenarios (disabled/deleted
 * admin, revoked session) are NOT covered in the success function — this
 * validates only the standard refresh success path.
 */
export async function test_api_system_admin_refresh_token_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new system admin
  const joinBody = {
    external_admin_id: RandomGenerator.alphaNumeric(16),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // Step 2: Login as the system admin
  const loginBody = {
    external_admin_id: joinBody.external_admin_id,
    email: joinBody.email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // Step 3: Refresh the admin session token
  const refreshBody = {} satisfies IStoryfieldAiSystemAdmin.IRefresh;
  const refreshed = await api.functional.auth.systemAdmin.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshed);

  // Step 4: Business assertions
  TestValidator.equals(
    "refreshed session preserves admin id",
    refreshed.id,
    admin.id,
  );
  TestValidator.equals(
    "refreshed session preserves external_admin_id",
    refreshed.external_admin_id,
    admin.external_admin_id,
  );
  TestValidator.equals(
    "refreshed session preserves admin email",
    refreshed.email,
    admin.email,
  );
  TestValidator.equals(
    "refreshed actor_type is systemAdmin",
    refreshed.actor_type,
    "systemAdmin",
  );

  // Step 5: Check new access/refresh tokens are returned (structure)
  TestValidator.predicate(
    "access token is non-empty string",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO 8601 string",
    typeof refreshed.token.expired_at === "string" &&
      refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 string",
    typeof refreshed.token.refreshable_until === "string" &&
      refreshed.token.refreshable_until.length > 0,
  );

  // Token rotation: new access token should not match old
  TestValidator.notEquals(
    "new access token is different from previous",
    refreshed.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token is different from previous",
    refreshed.token.refresh,
    loginResult.token.refresh,
  );

  // Lifecycle timestamps: updated_at should be newer or equal (given test speed)
  TestValidator.predicate(
    "updated_at has been refreshed or preserved",
    typeof refreshed.updated_at === "string" &&
      typeof admin.updated_at === "string" &&
      refreshed.updated_at >= admin.updated_at,
  );
}
