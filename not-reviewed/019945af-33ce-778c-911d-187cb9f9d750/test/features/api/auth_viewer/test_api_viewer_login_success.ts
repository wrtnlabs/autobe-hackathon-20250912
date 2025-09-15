import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * Tests the successful login workflow for a Viewer user in the FlexOffice
 * system.
 *
 * This test performs end-to-end validation of viewer user creation via the
 * join API, followed by authentication via the login API. It ensures that
 * the authorization tokens issued contain valid access and refresh tokens
 * conforming to expected formats and expiration rules.
 *
 * Steps:
 *
 * 1. Create a Viewer user with random valid credentials.
 * 2. Assert the join response is structurally valid.
 * 3. Login with the same credentials.
 * 4. Assert the login response is structurally valid.
 * 5. Confirm that tokens from join and login match in their access and refresh
 *    components.
 *
 * This validates seamless account creation and subsequent authentication
 * for Viewer roles.
 */
export async function test_api_viewer_login_success(
  connection: api.IConnection,
) {
  // 1. Generate random valid Viewer creation data
  const createBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeViewer.ICreate;

  // 2. Create Viewer user with join API
  const joinOutput: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, { body: createBody });
  typia.assert(joinOutput);

  // 3. Prepare login request with created credentials
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IFlexOfficeViewer.ILogin;

  // 4. Login using the login API
  const loginOutput: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, { body: loginBody });
  typia.assert(loginOutput);

  // 5. Validate token access and refresh are non-empty strings
  TestValidator.predicate(
    "join token.access is string and non-empty",
    typeof joinOutput.token.access === "string" &&
      joinOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token.access is string and non-empty",
    typeof loginOutput.token.access === "string" &&
      loginOutput.token.access.length > 0,
  );

  // 6. Assert equality of tokens issued during join and login
  TestValidator.equals(
    "login token.access matches join token.access",
    loginOutput.token.access,
    joinOutput.token.access,
  );
  TestValidator.equals(
    "login token.refresh matches join token.refresh",
    loginOutput.token.refresh,
    joinOutput.token.refresh,
  );
  TestValidator.equals(
    "login token.expired_at matches join token.expired_at",
    loginOutput.token.expired_at,
    joinOutput.token.expired_at,
  );
  TestValidator.equals(
    "login token.refreshable_until matches join token.refreshable_until",
    loginOutput.token.refreshable_until,
    joinOutput.token.refreshable_until,
  );
}
