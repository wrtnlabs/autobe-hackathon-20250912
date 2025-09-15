import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * Validates the successful login workflow of an Editor user.
 *
 * This test covers the creation of a valid Editor user account through the
 * join endpoint, followed by a successful login using the same credentials.
 * It asserts the correct issuance of authentication tokens and proper data
 * structure.
 *
 * Steps:
 *
 * 1. Create a new Editor user with randomized valid credentials.
 * 2. Log in with the created user's email and password.
 * 3. Verify issued tokens and user ID format.
 *
 * This confirms the end-to-end user authentication process for the Editor
 * role.
 */
export async function test_api_editor_login_success(
  connection: api.IConnection,
) {
  // 1. Create an Editor user by calling /auth/editor/join
  // Generate valid random data for IFlexOfficeEditor.ICreate: name, email, password
  const createBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
  } satisfies IFlexOfficeEditor.ICreate;
  const joinOutput: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: createBody });
  typia.assert(joinOutput);

  // 2. Login using the created user credentials
  // Use the same email and password as the join request
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loginOutput: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, { body: loginBody });
  typia.assert(loginOutput);

  // 3. Validate that returned data includes id and token properties
  TestValidator.predicate(
    "joined editor id is non-empty UUID",
    typeof joinOutput.id === "string" && joinOutput.id.length > 0,
  );
  TestValidator.equals(
    "join output token structure equals IAuthorizationToken",
    Object.keys(joinOutput.token).sort(),
    ["access", "expired_at", "refresh", "refreshable_until"].sort(),
  );
  TestValidator.equals(
    "login output token structure equals IAuthorizationToken",
    Object.keys(loginOutput.token).sort(),
    ["access", "expired_at", "refresh", "refreshable_until"].sort(),
  );
}
