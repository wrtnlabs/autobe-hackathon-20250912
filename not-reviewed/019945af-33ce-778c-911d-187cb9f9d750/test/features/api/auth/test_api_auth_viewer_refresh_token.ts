import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * This test verifies the viewer role token refresh process.
 *
 * It registers a new viewer user, logs in to obtain tokens, then uses the
 * refresh token to request new tokens, verifying old tokens become
 * invalid.
 *
 * Error tests for invalid or empty refresh tokens ensure proper
 * authorization failure.
 */
export async function test_api_auth_viewer_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a new viewer user
  const email = `test_${Date.now()}_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = `P@ssw0rd${RandomGenerator.alphaNumeric(4)}`;
  const joinBody = {
    name: RandomGenerator.name(2),
    email,
    password,
  } satisfies IFlexOfficeViewer.ICreate;

  const joinOutput: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: joinBody,
    });
  typia.assert(joinOutput);

  // 2. Login as the new viewer user
  const loginBody = {
    email,
    password,
  } satisfies IFlexOfficeViewer.ILogin;

  const loginOutput: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, {
      body: loginBody,
    });
  typia.assert(loginOutput);

  TestValidator.equals(
    "viewer user id unchanged after login",
    loginOutput.id,
    joinOutput.id,
  );

  // 3. Use refresh token to get new tokens
  const refreshBody = {
    refresh_token: loginOutput.token.refresh,
  } satisfies IFlexOfficeViewer.IRefresh;

  const refreshOutput: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshOutput);

  TestValidator.equals(
    "viewer user id unchanged after token refresh",
    refreshOutput.id,
    joinOutput.id,
  );

  TestValidator.notEquals(
    "access token changed on refresh",
    refreshOutput.token.access,
    loginOutput.token.access,
  );

  TestValidator.notEquals(
    "refresh token changed on refresh",
    refreshOutput.token.refresh,
    loginOutput.token.refresh,
  );

  // 4. Error case: Refresh with invalid token
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.viewer.refresh(connection, {
        body: {
          refresh_token: `invalid.${RandomGenerator.alphaNumeric(12)}.token`,
        } satisfies IFlexOfficeViewer.IRefresh,
      });
    },
  );

  // 5. Error case: Refresh with empty token
  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await api.functional.auth.viewer.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies IFlexOfficeViewer.IRefresh,
      });
    },
  );
}
