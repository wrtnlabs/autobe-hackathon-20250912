import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Validate nurse login fails with incorrect password and does not issue tokens.
 *
 * This test verifies that the nurse authentication endpoint correctly rejects
 * invalid login attempts with a wrong password, and that no authentication
 * token or session is granted.
 *
 * Steps:
 *
 * 1. Register a nurse with a valid business email and known password.
 * 2. Attempt to login using the correct email but an intentionally wrong password.
 * 3. Confirm that the API returns an error and does not establish a session.
 */
export async function test_api_nurse_login_wrong_password(
  connection: api.IConnection,
) {
  // 1. Register a nurse account
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePassword = RandomGenerator.alphaNumeric(10);
  const joinInput = {
    email: nurseEmail,
    full_name: RandomGenerator.name(2),
    license_number: RandomGenerator.alphaNumeric(8),
    password: nursePassword,
    specialty: "ICU",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: joinInput,
  });
  typia.assert(nurse);
  TestValidator.equals(
    "registered nurse email matches",
    nurse.email,
    nurseEmail,
  );

  // 2. Attempt login with correct email but incorrect password
  const wrongPassword = nursePassword + "!@#wrong";
  await TestValidator.error("login must fail with wrong password", async () => {
    await api.functional.auth.nurse.login(connection, {
      body: {
        email: nurseEmail,
        password: wrongPassword,
      } satisfies IHealthcarePlatformNurse.ILogin,
    });
  });
}
