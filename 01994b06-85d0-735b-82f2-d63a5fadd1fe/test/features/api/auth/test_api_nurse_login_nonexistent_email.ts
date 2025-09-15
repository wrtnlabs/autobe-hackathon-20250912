import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Test that login fails for a nurse using a non-existent email address.
 *
 * 1. Generate a nurse email and password that do not belong to any nurse.
 * 2. Attempt nurse login via /auth/nurse/login.
 * 3. Assert that an authentication error is returned and no session token is
 *    issued.
 */
export async function test_api_nurse_login_nonexistent_email(
  connection: api.IConnection,
) {
  const nonExistentEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const randomPassword: string = RandomGenerator.alphaNumeric(20);

  await TestValidator.error(
    "should fail login with wrong nurse email",
    async () => {
      await api.functional.auth.nurse.login(connection, {
        body: {
          email: nonExistentEmail,
          password: randomPassword,
        } satisfies IHealthcarePlatformNurse.ILogin,
      });
    },
  );
}
