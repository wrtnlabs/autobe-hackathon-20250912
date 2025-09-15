import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_regularuser_login_success(
  connection: api.IConnection,
) {
  // 1. Create a regular user via the join endpoint
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64), // simulate a valid hashed password
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const joinedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(joinedUser);

  // 2. Perform login with the created user's credentials
  const loginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });

  typia.assert(loggedInUser);

  // 3. Validate that the logged in user data matches the created user data
  TestValidator.equals(
    "Email matches after login",
    loggedInUser.email,
    userCreateBody.email,
  );
  TestValidator.equals(
    "Username matches after login",
    loggedInUser.username,
    userCreateBody.username,
  );
  TestValidator.equals(
    "Password hash matches after login",
    loggedInUser.password_hash,
    userCreateBody.password_hash,
  );
  TestValidator.predicate(
    "Token access is non-empty",
    typeof loggedInUser.token.access === "string" &&
      loggedInUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "Token refresh is non-empty",
    typeof loggedInUser.token.refresh === "string" &&
      loggedInUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Token expired_at is a valid ISO date",
    !isNaN(Date.parse(loggedInUser.token.expired_at)),
  );
  TestValidator.predicate(
    "Token refreshable_until is a valid ISO date",
    !isNaN(Date.parse(loggedInUser.token.refreshable_until)),
  );
}
