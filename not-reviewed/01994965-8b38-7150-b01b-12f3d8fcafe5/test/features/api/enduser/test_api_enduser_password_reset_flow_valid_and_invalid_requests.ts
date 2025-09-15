import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

/**
 * End user password reset full flow test.
 *
 * Validates the password reset API including happy path and common failure
 * cases.
 *
 * 1. Registers an end user.
 * 2. Performs a successful password reset for the existing user.
 * 3. Attempts password reset with non-existent email (expect failure).
 * 4. Attempts password reset with weak password for existing user (expect
 *    failure).
 */
export async function test_api_enduser_password_reset_flow_valid_and_invalid_requests(
  connection: api.IConnection,
) {
  // Step 1: Register a new end user
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderEndUser.ICreate;

  const authorizedUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Successful password reset for existing user
  const newValidPassword = RandomGenerator.alphaNumeric(16); // assume complex enough

  const resetRequest: ITelegramFileDownloaderEndUser.IResetPassword = {
    email: authorizedUser.email,
    new_password: newValidPassword,
  } satisfies ITelegramFileDownloaderEndUser.IResetPassword;

  const resetResponse: ITelegramFileDownloaderEndUser.IResetPasswordResponse =
    await api.functional.auth.endUser.password.reset.resetPassword(connection, {
      body: resetRequest,
    });
  typia.assert(resetResponse);
  TestValidator.predicate(
    "password reset success flag should be true for valid reset",
    resetResponse.success === true,
  );

  // Step 3: Attempt password reset with non-existent email
  const resetRequestNonExistent: ITelegramFileDownloaderEndUser.IResetPassword =
    {
      email: `not.exist.${RandomGenerator.alphaNumeric(8)}@example.com`,
      new_password: RandomGenerator.alphaNumeric(16),
    } satisfies ITelegramFileDownloaderEndUser.IResetPassword;

  await TestValidator.error(
    "password reset attempt with non-existent email should fail",
    async () => {
      await api.functional.auth.endUser.password.reset.resetPassword(
        connection,
        {
          body: resetRequestNonExistent,
        },
      );
    },
  );

  // Step 4: Attempt password reset with weak/invalid password for existing user
  // Assuming password policy requires length > 8 and at least alphnum
  // We'll attempt with an invalid password (too short)

  const resetRequestWeakPassword: ITelegramFileDownloaderEndUser.IResetPassword =
    {
      email: authorizedUser.email,
      new_password: "123", // obviously weak and invalid
    } satisfies ITelegramFileDownloaderEndUser.IResetPassword;

  await TestValidator.error(
    "password reset with weak password should fail",
    async () => {
      await api.functional.auth.endUser.password.reset.resetPassword(
        connection,
        {
          body: resetRequestWeakPassword,
        },
      );
    },
  );
}
