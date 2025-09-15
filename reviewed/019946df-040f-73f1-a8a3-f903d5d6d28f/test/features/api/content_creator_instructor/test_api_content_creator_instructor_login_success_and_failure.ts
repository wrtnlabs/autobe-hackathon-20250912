import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

export async function test_api_content_creator_instructor_login_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Create a new content creator/instructor account
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const passwordPlain = "securePassword123!";
  const passwordHash = "$2b$10$" + RandomGenerator.alphaNumeric(53); // bcrypt hash mock-up
  const createBody = {
    tenant_id: tenantId,
    email: RandomGenerator.name(1).replace(/\s/g, "") + "@example.com",
    password_hash: passwordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const authorizedUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedUser);

  // 2. Test successful login with correct email and password
  const loginBodySuccess = {
    email: authorizedUser.email,
    password: passwordPlain,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  const loginSuccess: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: loginBodySuccess,
    });
  typia.assert(loginSuccess);

  // Validate access and refresh tokens present and are strings
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof loginSuccess.token.access === "string" &&
      loginSuccess.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof loginSuccess.token.refresh === "string" &&
      loginSuccess.token.refresh.length > 0,
  );

  // 3. Test failure login with incorrect password
  const loginBodyWrongPassword = {
    email: authorizedUser.email,
    password: "wrongPassword!",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  await TestValidator.error(
    "login fails when password is incorrect",
    async () => {
      await api.functional.auth.contentCreatorInstructor.login(connection, {
        body: loginBodyWrongPassword,
      });
    },
  );

  // 4. Test failure login with non-existent email
  const loginBodyNonExistentEmail = {
    email: "nonexistent" + RandomGenerator.alphaNumeric(5) + "@example.com",
    password: "somePassword!",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  await TestValidator.error(
    "login fails when email does not exist",
    async () => {
      await api.functional.auth.contentCreatorInstructor.login(connection, {
        body: loginBodyNonExistentEmail,
      });
    },
  );
}
