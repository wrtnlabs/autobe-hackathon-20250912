import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

/**
 * Test the external learner role's refresh token success and failure flows.
 *
 * 1. Register a new external learner guest account with all required fields.
 * 2. Assert the authorized response includes valid tokens.
 * 3. Use the returned refresh token to request a token refresh.
 * 4. Verify that new tokens are issued correctly and token claims remain
 *    consistent.
 * 5. Attempt refreshing tokens with an invalid refresh token and expect
 *    failure.
 * 6. Attempt refreshing tokens with an expired token or revoked token scenario
 *    and expect rejection.
 *
 * This test asserts both success and failure cases for handling JWT refresh
 * tokens for guest external learners.
 */
export async function test_api_external_learner_refresh_token_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Register new external learner guest account
  const joinRequestBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const authorized: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      { body: joinRequestBody },
    );
  typia.assert(authorized);

  // Validate initial tokens presence
  TestValidator.predicate(
    "initial access_token exists",
    authorized.access_token !== undefined && authorized.access_token !== null,
  );
  TestValidator.predicate(
    "initial refresh_token exists",
    authorized.refresh_token !== undefined && authorized.refresh_token !== null,
  );

  TestValidator.equals(
    "tenant_id matches",
    authorized.tenant_id,
    joinRequestBody.tenant_id,
  );
  TestValidator.equals("status is active", authorized.status, "active");

  // 2. Refresh token successfully
  const refreshRequestBody = {
    refresh_token: authorized.refresh_token ?? "",
  } satisfies IEnterpriseLmsExternalLearner.IRefresh;

  const refreshedTokens: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.refresh.refreshExternalLearner(
      connection,
      { body: refreshRequestBody },
    );
  typia.assert(refreshedTokens);

  TestValidator.predicate(
    "refreshed access_token exists",
    refreshedTokens.access_token !== undefined &&
      refreshedTokens.access_token !== null,
  );
  TestValidator.predicate(
    "refreshed refresh_token exists",
    refreshedTokens.refresh_token !== undefined &&
      refreshedTokens.refresh_token !== null,
  );

  TestValidator.equals(
    "tenant_id matches on refresh",
    refreshedTokens.tenant_id,
    authorized.tenant_id,
  );
  TestValidator.equals(
    "status remains active on refresh",
    refreshedTokens.status,
    "active",
  );

  // 3. Failure case: invalid refresh token
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.externalLearner.refresh.refreshExternalLearner(
        connection,
        {
          body: {
            refresh_token: "invalid.token.value",
          } satisfies IEnterpriseLmsExternalLearner.IRefresh,
        },
      );
    },
  );

  // 4. Failure case: simulating expired or revoked token by using a made-up token (different from valid tokens)
  await TestValidator.error(
    "refresh with expired or revoked token should fail",
    async () => {
      await api.functional.auth.externalLearner.refresh.refreshExternalLearner(
        connection,
        {
          body: {
            refresh_token: "00000000-0000-0000-0000-000000000000",
          } satisfies IEnterpriseLmsExternalLearner.IRefresh,
        },
      );
    },
  );
}
