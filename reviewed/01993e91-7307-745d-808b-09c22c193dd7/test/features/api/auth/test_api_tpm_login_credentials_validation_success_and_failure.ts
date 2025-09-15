import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Tests TPM user login authentication scenarios including success and
 * failure.
 *
 * This test covers the full TPM login workflow:
 *
 * 1. Register a TPM user via the join API.
 * 2. Attempt login with correct credentials and verify authorized user data
 *    including tokens.
 * 3. Attempt login with incorrect email and expect authentication failure.
 * 4. Attempt login with incorrect password and expect authentication failure.
 *
 * The test ensures that only valid credential combinations authenticate
 * successfully, and invalid credentials securely reject login without
 * issuing tokens.
 *
 * Uses precise DTO types, proper data generation, and typia assertions for
 * response validation. Authentication is handled via actual API calls, no
 * manual token handling. Asynchronous operations are correctly awaited.
 *
 * This comprehensive test guarantees robustness and security of the TPM
 * login endpoint.
 */
export async function test_api_tpm_login_credentials_validation_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Register a TPM user
  // Create a realistic join request body with required properties
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  // Call join API to register the user
  const authorizedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinRequest });
  typia.assert(authorizedUser);

  // 2. Attempt login with correct credentials
  const loginRequestValid = {
    email: joinRequest.email,
    password: joinRequest.password,
  } satisfies ITaskManagementTpm.ILogin;

  const loginSuccess: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: loginRequestValid,
    });
  typia.assert(loginSuccess);

  // Validate that the returned user and tokens match expectations
  TestValidator.equals(
    "login user id matches join user id",
    loginSuccess.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "login email matches join email",
    loginSuccess.email,
    joinRequest.email,
  );
  TestValidator.equals(
    "login name matches join name",
    loginSuccess.name,
    joinRequest.name,
  );
  TestValidator.predicate(
    "access token exists",
    typeof loginSuccess.token.access === "string" &&
      loginSuccess.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    typeof loginSuccess.token.refresh === "string" &&
      loginSuccess.token.refresh.length > 0,
  );

  // 3. Attempt login with invalid email
  const loginRequestWrongEmail = {
    email: RandomGenerator.alphaNumeric(16) + "@invalid.com",
    password: joinRequest.password,
  } satisfies ITaskManagementTpm.ILogin;

  await TestValidator.error("login fails with wrong email", async () => {
    await api.functional.auth.tpm.login(connection, {
      body: loginRequestWrongEmail,
    });
  });

  // 4. Attempt login with invalid password
  const loginRequestWrongPassword = {
    email: joinRequest.email,
    password: RandomGenerator.alphaNumeric(12), // different random password
  } satisfies ITaskManagementTpm.ILogin;

  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.auth.tpm.login(connection, {
      body: loginRequestWrongPassword,
    });
  });
}
