import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

export async function test_api_pm_login_success(connection: api.IConnection) {
  // Step 1: Generate a new PM user credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssword1234"; // fixed valid password for testing
  const name = RandomGenerator.name();

  // Step 2: Register the new user using /auth/pm/join
  const createdPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: email,
        password: password,
        name: name,
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(createdPm);

  // Validate created user does not expose password (only hashed)
  TestValidator.predicate(
    "password_hash is string in createdPm",
    typeof createdPm.password_hash === "string",
  );

  // Step 3: Login with correct credentials
  const loginResponse: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: {
        email: email,
        password: password,
      } satisfies ITaskManagementPm.ILogin,
    });
  typia.assert(loginResponse);

  // Validate the token presence
  TestValidator.predicate(
    "access token exists",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );

  // Validate returned user info matches created user
  TestValidator.equals("user id matches", loginResponse.id, createdPm.id);
  TestValidator.equals("user email matches", loginResponse.email, email);
  TestValidator.equals("user name matches", loginResponse.name, name);

  // Validate password_hash in login response
  TestValidator.equals(
    "password_hash matches",
    loginResponse.password_hash,
    createdPm.password_hash,
  );

  // Validate password is NOT directly exposed in login response
  TestValidator.predicate(
    "no plain password exposed in login response",
    !("password" in loginResponse),
  );

  // Step 4: Login failure test with incorrect password
  await TestValidator.error("login fails with incorrect password", async () => {
    await api.functional.auth.pm.login(connection, {
      body: {
        email: email,
        password: "WrongPassword!",
      } satisfies ITaskManagementPm.ILogin,
    });
  });

  // Step 5: Login failure test with unregistered email
  const randomUnregisteredEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error("login fails with unregistered email", async () => {
    await api.functional.auth.pm.login(connection, {
      body: {
        email: randomUnregisteredEmail,
        password: password,
      } satisfies ITaskManagementPm.ILogin,
    });
  });

  // Step 6: Repeat login to confirm session token consistency
  const secondLoginResponse: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: {
        email: email,
        password: password,
      } satisfies ITaskManagementPm.ILogin,
    });
  typia.assert(secondLoginResponse);

  // Tokens consistency check
  TestValidator.equals(
    "access token consistent",
    secondLoginResponse.token.access,
    loginResponse.token.access,
  );
  TestValidator.equals(
    "refresh token consistent",
    secondLoginResponse.token.refresh,
    loginResponse.token.refresh,
  );

  // User info consistency
  TestValidator.equals(
    "user id consistent",
    secondLoginResponse.id,
    loginResponse.id,
  );
  TestValidator.equals(
    "user email consistent",
    secondLoginResponse.email,
    loginResponse.email,
  );
  TestValidator.equals(
    "user name consistent",
    secondLoginResponse.name,
    loginResponse.name,
  );
  TestValidator.equals(
    "password_hash consistent",
    secondLoginResponse.password_hash,
    loginResponse.password_hash,
  );
}
