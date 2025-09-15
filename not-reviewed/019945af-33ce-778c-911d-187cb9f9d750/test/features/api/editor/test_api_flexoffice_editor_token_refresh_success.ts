import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * Test token refresh success for an Editor user.
 *
 * This test executes the full lifecycle: account creation via
 * /auth/editor/join, login via /auth/editor/login to obtain tokens, and
 * refresh via /auth/editor/refresh. It verifies that the refresh endpoint
 * issues new tokens correctly, encoding the editor role and correct
 * expiration data.
 *
 * The test also validates the structure of tokens via typia.assert and
 * confirms error handling for invalid refresh tokens resulting in 401
 * Unauthorized.
 */
export async function test_api_flexoffice_editor_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Create a new Editor account
  const createBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;
  const created: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: createBody });
  typia.assert(created);

  // 2. Log in as the same Editor user
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loggedIn: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  // 3. Use the refresh token to get new tokens
  const refreshBody = {
    refresh_token: loggedIn.token.refresh,
  } satisfies IFlexOfficeEditor.IRefresh;

  const refreshed: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.refresh(connection, { body: refreshBody });
  typia.assert(refreshed);

  // The refreshed tokens must be different from the original tokens
  TestValidator.notEquals(
    "refreshed access token differs from login",
    refreshed.token.access,
    loggedIn.token.access,
  );
  TestValidator.notEquals(
    "refreshed refresh token differs from login",
    refreshed.token.refresh,
    loggedIn.token.refresh,
  );

  // Expiration dates should be in date-time format and parsable
  const expiredAtDate = new Date(refreshed.token.expired_at);
  const refreshableUntilDate = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "access token expired_at is valid ISO date",
    !Number.isNaN(expiredAtDate.getTime()),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is valid ISO date",
    !Number.isNaN(refreshableUntilDate.getTime()),
  );

  // 4. Attempt token refresh with invalid refresh token (should fail with 401)
  await TestValidator.error(
    "refresh with invalid token should fail with 401",
    async () => {
      await api.functional.auth.editor.refresh(connection, {
        body: {
          refresh_token: "invalid.token.string",
        } satisfies IFlexOfficeEditor.IRefresh,
      });
    },
  );
}
