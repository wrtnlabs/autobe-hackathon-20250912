import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test the TPM token refresh workflow with valid and invalid tokens.
 *
 * This test verifies that a registered TPM user can successfully refresh
 * tokens using a valid refresh token, and that the system correctly rejects
 * invalid or empty refresh tokens.
 *
 * Test steps:
 *
 * 1. Register a new TPM user.
 * 2. Login with the TPM user to obtain access and refresh tokens.
 * 3. Use the valid refresh token to obtain new tokens.
 * 4. Attempt to refresh tokens with an invalid token and expect failure.
 * 5. Attempt to refresh tokens with an empty token and expect failure.
 *
 * All API responses are validated with strict type assertions.
 */
export async function test_api_tpm_refresh_token_valid_and_invalid_cases(
  connection: api.IConnection,
) {
  // 1. Register TPM user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const joinResult: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(joinResult);

  // 2. Login TPM user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const loginResult: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody });
  typia.assert(loginResult);

  // 3. Use valid refresh token to refresh access token
  const refreshBodyValid = {
    refresh_token: loginResult.token.refresh,
  } satisfies ITaskManagementTpm.IRefresh;

  const refreshResultValid: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.refresh(connection, {
      body: refreshBodyValid,
    });
  typia.assert(refreshResultValid);

  TestValidator.predicate(
    "valid refresh token creates fresh access token",
    typeof refreshResultValid.token.access === "string" &&
      refreshResultValid.token.access.length > 10,
  );

  // 4. Invalid refresh token - expect error
  await TestValidator.error(
    "invalid refresh token should cause error",
    async () => {
      await api.functional.auth.tpm.refresh(connection, {
        body: {
          refresh_token: "invalid-token-1234567890",
        } satisfies ITaskManagementTpm.IRefresh,
      });
    },
  );

  // 5. Empty refresh token - expect error
  await TestValidator.error(
    "empty refresh token should cause error",
    async () => {
      await api.functional.auth.tpm.refresh(connection, {
        body: { refresh_token: "" } satisfies ITaskManagementTpm.IRefresh,
      });
    },
  );
}
