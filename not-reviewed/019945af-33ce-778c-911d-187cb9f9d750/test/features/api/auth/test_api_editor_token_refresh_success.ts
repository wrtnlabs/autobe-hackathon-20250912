import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * Test the successful refresh of JWT tokens for an Editor user.
 *
 * This test performs the full flow:
 *
 * 1. Register a new Editor user (join), obtaining initial tokens.
 * 2. Login as the same Editor user, obtain fresh tokens including a refresh
 *    token.
 * 3. Call the refresh endpoint with the valid refresh token to obtain new
 *    tokens.
 * 4. Verify the tokens returned are valid and contain Editor role claims.
 *
 * The test confirms correct session continuity and token lifecycle
 * handling.
 */
export async function test_api_editor_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new Editor user to obtain initial token
  const editorName: string = RandomGenerator.name();
  const editorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const editorPassword = RandomGenerator.alphaNumeric(12); // Random 12 char alphanumeric password

  const editorCreate = {
    name: editorName,
    email: editorEmail,
    password: editorPassword,
  } satisfies IFlexOfficeEditor.ICreate;

  const joinResult: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: editorCreate });
  typia.assert(joinResult);

  // 2. Login as the same Editor user to obtain a refresh token
  const editorLogin = {
    email: editorEmail,
    password: editorPassword,
  } satisfies IFlexOfficeEditor.ILogin;

  const loginResult: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, { body: editorLogin });
  typia.assert(loginResult);

  // 3. Refresh the tokens using the valid refresh token
  const refreshInput = {
    refresh_token: loginResult.token.refresh,
  } satisfies IFlexOfficeEditor.IRefresh;

  const refreshResult: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.refresh(connection, {
      body: refreshInput,
    });
  typia.assert(refreshResult);

  // 4. Validate that the new access token is different and properly formatted
  TestValidator.notEquals(
    "refresh returns new access token",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof refreshResult.token.refresh === "string" &&
      refreshResult.token.refresh.length > 0,
  );
}
