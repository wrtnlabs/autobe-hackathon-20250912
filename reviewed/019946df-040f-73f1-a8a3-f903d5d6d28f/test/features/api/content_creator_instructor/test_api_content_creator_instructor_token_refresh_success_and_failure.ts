import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

/**
 * Validates the refresh token operation for contentCreatorInstructor role.
 *
 * 1. Creates a new content creator/instructor account with tenant ID, email,
 *    hashed password, name, and active status.
 * 2. Logs in the user with valid credentials to obtain initial access and
 *    refresh tokens.
 * 3. Performs token refresh using the valid refresh token and verifies new
 *    tokens differ from the original.
 * 4. Tests failure scenarios with invalid and empty refresh tokens, expecting
 *    API errors.
 *
 * This ensures continuous authentication sessions and proper token
 * lifecycle management.
 */
export async function test_api_content_creator_instructor_token_refresh_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Prepare tenant and user credentials
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const passwordRaw = "P@ssw0rd!";
  // Simulate a hashed password (base64 encoded for simplicity)
  const passwordHash = Buffer.from(passwordRaw).toString("base64");
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  // 2. Create new content creator/instructor user (join)
  const createBody = {
    tenant_id: tenantId,
    email: email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const createdUser = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    { body: createBody },
  );
  typia.assert(createdUser);

  // 3. Login with valid credentials
  const loginBody = {
    email: email,
    password: passwordRaw,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  const loggedInUser = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedInUser);

  TestValidator.equals(
    "login email matches created",
    loggedInUser.email,
    email,
  );

  // 4. Refresh token successful use case
  const refreshBody = {
    refresh_token: loggedInUser.token.refresh,
  } satisfies IEnterpriseLmsContentCreatorInstructor.IRefresh;
  const refreshedUser =
    await api.functional.auth.contentCreatorInstructor.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedUser);

  TestValidator.notEquals(
    "refreshed access token differs from original",
    refreshedUser.token.access,
    loggedInUser.token.access,
  );
  TestValidator.notEquals(
    "refreshed refresh token differs from original",
    refreshedUser.token.refresh,
    loggedInUser.token.refresh,
  );

  // 5. Refresh token failure case with invalid token
  const invalidRefreshBody = {
    refresh_token: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IEnterpriseLmsContentCreatorInstructor.IRefresh;
  await TestValidator.error(
    "refresh token with invalid token should fail",
    async () => {
      await api.functional.auth.contentCreatorInstructor.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );

  // 6. Refresh token failure case with empty token
  const emptyRefreshBody = {
    refresh_token: "",
  } satisfies IEnterpriseLmsContentCreatorInstructor.IRefresh;
  await TestValidator.error(
    "refresh token with empty token should fail",
    async () => {
      await api.functional.auth.contentCreatorInstructor.refresh(connection, {
        body: emptyRefreshBody,
      });
    },
  );
}
