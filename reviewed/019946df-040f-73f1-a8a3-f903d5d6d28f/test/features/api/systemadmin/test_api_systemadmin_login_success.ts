import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

export async function test_api_systemadmin_login_success(
  connection: api.IConnection,
) {
  // 1. Create a system admin user by join endpoint
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const authorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });

  typia.assert(authorized);

  // 2. Attempt valid login
  const loginBodyValid: IEnterpriseLmsSystemAdmin.ILogin = {
    email: createBody.email,
    password_hash: createBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBodyValid,
    });
  typia.assert(loggedIn);

  TestValidator.predicate(
    "valid login returns access token",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "valid login returns refresh token",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "valid login token expired_at format",
    typeof loggedIn.token.expired_at === "string" &&
      loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "valid login token refreshable_until format",
    typeof loggedIn.token.refreshable_until === "string" &&
      loggedIn.token.refreshable_until.length > 0,
  );

  // 3. Attempt login with invalid password_hash
  const loginBodyInvalidPassword: IEnterpriseLmsSystemAdmin.ILogin = {
    email: createBody.email,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  await TestValidator.error(
    "login fails with invalid password hash",
    async () => {
      await api.functional.auth.systemAdmin.login(connection, {
        body: loginBodyInvalidPassword,
      });
    },
  );

  // 4. Attempt login with non-existent email
  const loginBodyNonExistentEmail: IEnterpriseLmsSystemAdmin.ILogin = {
    email: `${RandomGenerator.alphaNumeric(8)}@nonexistent.test`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  await TestValidator.error("login fails with non-existent email", async () => {
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBodyNonExistentEmail,
    });
  });
}
