import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Validate that registering a nurse with an email address already in use is
 * rejected.
 *
 * Ensures uniqueness constraint on nurse email is enforced and duplicate
 * accounts cannot be created.
 *
 * Steps:
 *
 * 1. Register the first nurse using business-email, name, license_number
 * 2. Attempt duplicate registration with the same email/credentials
 * 3. Confirm the API returns an error and does not create another account
 */
export async function test_api_nurse_join_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Generate valid unique registration data
  const email: string & tags.Format<"email"> =
    "nurse." + RandomGenerator.alphaNumeric(8) + "@hospital-abc.org";
  const password = RandomGenerator.alphaNumeric(12);
  const nurseJoin = {
    email,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    specialty: "ICU",
    phone: RandomGenerator.mobile(),
    password: password,
  } satisfies IHealthcarePlatformNurse.IJoin;

  // 2. Register the nurse - should succeed
  const authorized: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.join(connection, {
      body: nurseJoin,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "email matches registration",
    authorized.email,
    nurseJoin.email,
  );

  // 3. Attempt duplicate registration with same email
  await TestValidator.error(
    "duplicate email registration is rejected",
    async () => {
      await api.functional.auth.nurse.join(connection, {
        body: nurseJoin,
      });
    },
  );
}
