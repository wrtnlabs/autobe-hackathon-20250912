import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

export async function test_api_guest_refresh_token_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Create a new guest user account via the join endpoint to obtain initial tokens
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  const createBody = {
    tenant_id: tenantId,
    email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status,
  } satisfies IEnterpriseLmsGuest.ICreate;

  const joinResponse: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: createBody });
  typia.assert(joinResponse);

  // Check that mandatory properties exist in joinResponse
  TestValidator.predicate(
    "Join response has access token",
    typeof joinResponse.access_token === "string" &&
      joinResponse.access_token.length > 0,
  );
  TestValidator.predicate(
    "Join response has refresh token",
    typeof joinResponse.refresh_token === "string" &&
      joinResponse.refresh_token.length > 0,
  );

  // Ensure joinResponse.refresh_token is non-nullable for safe use
  const refreshToken = typia.assert<string & tags.Format<"uuid">>(
    joinResponse.refresh_token!,
  );

  // 2. Use the valid refresh token to successfully refresh JWT tokens
  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies IEnterpriseLmsGuest.IRefresh;

  const refreshResponse: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshResponse);

  // Validate that new tokens are generated and are different from the originals
  TestValidator.notEquals(
    "Refresh token is renewed",
    refreshResponse.refresh_token,
    joinResponse.refresh_token,
  );
  TestValidator.notEquals(
    "Access token is renewed",
    refreshResponse.access_token,
    joinResponse.access_token,
  );

  // 3. Attempt refreshing with invalid refresh tokens to assert proper error handling
  await TestValidator.error(
    "Refresh with invalid refresh token should fail",
    async () => {
      const invalidRefreshBody = {
        refresh_token: "invalid-refresh-token",
      } satisfies IEnterpriseLmsGuest.IRefresh;
      await api.functional.auth.guest.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );

  await TestValidator.error(
    "Refresh with empty refresh token should fail",
    async () => {
      const emptyRefreshBody = {
        refresh_token: "",
      } satisfies IEnterpriseLmsGuest.IRefresh;
      await api.functional.auth.guest.refresh(connection, {
        body: emptyRefreshBody,
      });
    },
  );
}
