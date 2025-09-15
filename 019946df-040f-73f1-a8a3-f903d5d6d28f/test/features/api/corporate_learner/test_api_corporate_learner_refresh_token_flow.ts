import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";

/**
 * Validate the refresh token lifecycle for a corporate learner account.
 *
 * This test performs the following steps:
 *
 * 1. Creates a new corporate learner account in a tenant context via the join
 *    API.
 * 2. Obtains initial JWT access and refresh tokens upon successful join.
 * 3. Uses the refresh API endpoint with the valid refresh token to get new
 *    tokens.
 * 4. Validates that new tokens are issued with updated expiry times.
 * 5. Ensures tenant ID consistency between initial and refreshed tokens.
 * 6. Tests failure behavior when refreshing with an invalid token.
 * 7. Tests failure behavior when refreshing with an expired token (simulated
 *    by invalid refresh token).
 *
 * All API calls use proper DTOs, typia.assert validation, and TestValidator
 * for assertions. Async/await is adhered to strictly. No direct header
 * manipulation.
 *
 * This test ensures correct token renewal, tenant isolation, and secure
 * error handling.
 */
export async function test_api_corporate_learner_refresh_token_flow(
  connection: api.IConnection,
) {
  // 1. Create corporate learner account (join)
  const tenantId: string = typia.random<string & tags.Format<"uuid">>();
  const joinBody = {
    tenant_id: tenantId,
    email: `user${RandomGenerator.alphaNumeric(6)}@corporate.example.com`,
    password: "StrongPassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const authorized: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: joinBody,
    });

  typia.assert(authorized);

  // 2. Validate initial token info
  const initialToken: IAuthorizationToken = authorized.token;
  typia.assert(initialToken);

  TestValidator.predicate(
    "initial access token is non-empty",
    initialToken.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token is non-empty",
    initialToken.refresh.length > 0,
  );
  TestValidator.equals(
    "tenant id matches in authorized",
    authorized.tenant_id,
    tenantId,
  );

  // 3. Use refresh API endpoint with valid refresh token
  const refreshRequestBody = {
    refresh_token: initialToken.refresh,
  } satisfies IEnterpriseLmsCorporateLearner.IRequestRefresh;

  const refreshedAuthorized: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.refresh(connection, {
      body: refreshRequestBody,
    });

  typia.assert(refreshedAuthorized);
  const refreshedToken = refreshedAuthorized.token;
  typia.assert(refreshedToken);

  // 4. Validate refreshed token info (new tokens issued)
  TestValidator.predicate(
    "refreshed access token is different",
    refreshedToken.access !== initialToken.access &&
      refreshedToken.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is different",
    refreshedToken.refresh !== initialToken.refresh &&
      refreshedToken.refresh.length > 0,
  );

  // 5. Validate expiry times are updated (newer than initial)
  TestValidator.predicate(
    "refreshed 'expired_at' is newer",
    new Date(refreshedToken.expired_at) > new Date(initialToken.expired_at),
  );
  TestValidator.predicate(
    "refreshed 'refreshable_until' is newer",
    new Date(refreshedToken.refreshable_until) >
      new Date(initialToken.refreshable_until),
  );

  // 6. Tenant ID in refreshed token matches original
  TestValidator.equals(
    "tenant id matches in refreshed authorized",
    refreshedAuthorized.tenant_id,
    tenantId,
  );

  // 7. Test failure with invalid refresh token
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.corporateLearner.refresh(connection, {
        body: {
          refresh_token: "invalid-token-123456",
        } satisfies IEnterpriseLmsCorporateLearner.IRequestRefresh,
      });
    },
  );

  // 8. Test failure with expired refresh token simulation (reuse invalid token)
  await TestValidator.error(
    "refresh with expired token simulation should fail",
    async () => {
      await api.functional.auth.corporateLearner.refresh(connection, {
        body: {
          refresh_token: "expired-token-abcdef",
        } satisfies IEnterpriseLmsCorporateLearner.IRequestRefresh,
      });
    },
  );
}
