import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";

/**
 * E2E test validating successful developer login.
 *
 * This test ensures a developer user can be created using the join API, and
 * then successfully log in using the login API with correct credentials. It
 * verifies the issuance and validity of JWT tokens and confirms that the
 * returned user data matches the created user.
 *
 * Workflow:
 *
 * 1. Create developer user with valid email, password_hash, and name.
 * 2. Login with the created user's email and password.
 * 3. Assert received token's properties and format.
 * 4. Verify login user info matches creation info.
 */
export async function test_api_developer_login_success(
  connection: api.IConnection,
) {
  // 1. Create developer user via join API
  const developerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;

  const developerAuthorized: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developerAuthorized);

  // 2. Login with the developer user credentials
  const developerLoginBody = {
    email: developerCreateBody.email,
    password: developerCreateBody.password_hash,
  } satisfies ITaskManagementDeveloper.ILogin;

  const loginResponse: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(loginResponse);

  // 3. Validate authentication token presence and shape
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is a valid ISO date-time string",
    typeof loginResponse.token.expired_at === "string" &&
      !isNaN(Date.parse(loginResponse.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is a valid ISO date-time string",
    typeof loginResponse.token.refreshable_until === "string" &&
      !isNaN(Date.parse(loginResponse.token.refreshable_until)),
  );

  // 4. Validate that login user information matches the created user
  TestValidator.equals(
    "developer email matches created user",
    loginResponse.email,
    developerCreateBody.email,
  );
  TestValidator.equals(
    "developer name matches created user",
    loginResponse.name,
    developerCreateBody.name,
  );
}
