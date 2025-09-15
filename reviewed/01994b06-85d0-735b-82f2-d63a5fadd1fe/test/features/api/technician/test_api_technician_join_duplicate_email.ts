import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate error handling when registering a technician with a duplicate
 * email.
 *
 * 1. Generate a random, valid business email and other technician credentials
 *    (full name, license_number, specialty, phone).
 * 2. Register a technician using these credentials successfully (should
 *    succeed, return IAuthorized and set session token).
 * 3. Attempt to register a second technician with the SAME email, but a
 *    different full name and license_number to ensure only the email is the
 *    duplicate.
 * 4. Confirm that the API throws an error (using TestValidator.error), meaning
 *    duplicate technician is rejected.
 * 5. No need to check response details, just that the error is correctly
 *    thrown.
 */
export async function test_api_technician_join_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Register first technician
  const email = typia.random<string & tags.Format<"email">>();
  const license_number1 = RandomGenerator.alphaNumeric(10);
  const joinBody1 = {
    email,
    full_name: RandomGenerator.name(),
    license_number: license_number1,
    specialty: RandomGenerator.paragraph({ sentences: 1 }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformTechnician.IJoin;
  const output1 = await api.functional.auth.technician.join(connection, {
    body: joinBody1,
  });
  typia.assert(output1);

  // 2. Attempt duplicate registration with same email, new license_number and full_name
  const license_number2 = RandomGenerator.alphaNumeric(10);
  const joinBody2 = {
    email, // same email
    full_name: RandomGenerator.name(),
    license_number: license_number2,
    specialty: RandomGenerator.paragraph({ sentences: 1 }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformTechnician.IJoin;
  await TestValidator.error(
    "duplicate technician email registration should fail",
    async () => {
      await api.functional.auth.technician.join(connection, {
        body: joinBody2,
      });
    },
  );
}
