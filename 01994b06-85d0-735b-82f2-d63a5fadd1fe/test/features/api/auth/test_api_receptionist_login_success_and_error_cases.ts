import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Test receptionist login error cases and registration workflow.
 *
 * Due to API restrictions (receptionist registration does not accept password),
 * only error cases can be tested for receptionist login with arbitrary
 * password. Registration (join) is verified to succeed for unique email. Error
 * scenarios: login as non-existent user. Other business error paths (wrong
 * password, soft-deleted user, disabled user) cannot be validated as password
 * cannot be set or known.
 *
 * Steps:
 *
 * 1. Create/register new receptionist with unique email, verify output.
 * 2. Try login as non-existent user (random email), verify error response.
 */
export async function test_api_receptionist_login_success_and_error_cases(
  connection: api.IConnection,
) {
  // 1. Create and register new receptionist
  const receptionistEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const receptionistProfile = {
    email: receptionistEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: receptionistProfile,
    });
  typia.assert(receptionist);
  TestValidator.equals(
    "email matches on join",
    receptionist.email,
    receptionistEmail,
  );
  TestValidator.predicate(
    "token.access is string",
    typeof receptionist.token.access === "string",
  );
  TestValidator.predicate(
    "token.refresh is string",
    typeof receptionist.token.refresh === "string",
  );

  // 2. Login as non-existent user (random email)
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const loginNonexistent = {
    email: nonExistentEmail,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformReceptionist.ILogin;
  await TestValidator.error(
    "login for non-existent user should fail",
    async () => {
      await api.functional.auth.receptionist.login(connection, {
        body: loginNonexistent,
      });
    },
  );
}
