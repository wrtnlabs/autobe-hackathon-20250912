import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validates successful token refreshing for an authenticated organization
 * administrator user.
 *
 * This test workflow performs the following steps:
 *
 * 1. Authenticates an organization administrator user via login to obtain
 *    access and refresh tokens.
 * 2. Uses the received refresh token to request new JWT tokens via the refresh
 *    API endpoint.
 * 3. Asserts that new tokens differ from the original tokens, confirming
 *    proper token renewal.
 * 4. Validates that user identity fields remain consistent after token
 *    refresh.
 * 5. Checks that the new token expiration timestamps conform to ISO 8601
 *    date-time format.
 *
 * This ensures secure session continuity and proper token lifecycle
 * management.
 */
export async function test_api_organization_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Authenticate the organizationAdmin user to obtain initial tokens
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const authorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(authorized);

  // Step 2: Refresh tokens using the obtained refresh token
  const refreshBody = {
    refresh_token: authorized.token.refresh,
  } satisfies IEnterpriseLmsOrganizationAdmin.IRefresh;

  const refreshed: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // Step 3: Validate that new tokens differ from the old ones and user info remains consistent
  TestValidator.notEquals(
    "refresh token should differ after refresh",
    refreshed.token.refresh,
    authorized.token.refresh,
  );

  TestValidator.notEquals(
    "access token should differ after refresh",
    refreshed.token.access,
    authorized.token.access,
  );

  TestValidator.equals(
    "user id should remain unchanged after refresh",
    refreshed.id,
    authorized.id,
  );

  TestValidator.equals(
    "tenant id should remain unchanged after refresh",
    refreshed.tenant_id,
    authorized.tenant_id,
  );

  TestValidator.equals(
    "email should remain unchanged after refresh",
    refreshed.email,
    authorized.email,
  );
  TestValidator.equals(
    "first name should remain unchanged after refresh",
    refreshed.first_name,
    authorized.first_name,
  );
  TestValidator.equals(
    "last name should remain unchanged after refresh",
    refreshed.last_name,
    authorized.last_name,
  );
  TestValidator.equals(
    "status should remain unchanged after refresh",
    refreshed.status,
    authorized.status,
  );
  TestValidator.predicate(
    "refreshed token expired_at is a valid ISO 8601 string",
    typeof refreshed.token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(
        refreshed.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "refreshed token refreshable_until is a valid ISO 8601 string",
    typeof refreshed.token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(
        refreshed.token.refreshable_until,
      ),
  );
}
