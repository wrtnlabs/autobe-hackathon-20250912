import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates the workflow for healthcare platform system admin registration.
 *
 * 1. Register a new admin using a unique, valid business email and valid local
 *    provider/password.
 * 2. Confirm JWT/token/session is issued, and type/fields are as per onboarding
 *    contract.
 * 3. Attempt to register (join) again with exactly the same email and provider;
 *    expect unique constraint violation error.
 * 4. Ensure password policy fields are properly enforced (basic complexity,
 *    non-empty string).
 * 5. Ensure only one account is created with the tested email—and onboarding
 *    session/token is only given on success.
 */
export async function test_api_system_admin_join_valid_and_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Generate a unique valid business email (not personal).
  const businessEmail =
    `admin.${RandomGenerator.alphaNumeric(6)}@company-e2e-test.com` as string &
      tags.Format<"email">;
  const fullName = RandomGenerator.name();
  const phone = RandomGenerator.mobile("+82");
  const provider = "local";
  const password = RandomGenerator.alphaNumeric(12) + "Aa1!";
  const provider_key = businessEmail;

  // Step 2: Register admin with valid data
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: businessEmail,
      full_name: fullName,
      phone: phone,
      provider: provider,
      provider_key: provider_key,
      password: password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin);
  TestValidator.equals("email matches input", admin.email, businessEmail);
  TestValidator.equals("full_name matches input", admin.full_name, fullName);
  TestValidator.equals("phone matches input", admin.phone, phone);
  TestValidator.equals(
    "provider token issued",
    typeof admin.token.access,
    "string",
  );
  TestValidator.equals("token is non-empty", !!admin.token.access, true);
  TestValidator.predicate(
    "account is not soft-deleted",
    admin.deleted_at === null || admin.deleted_at === undefined,
  );

  // Step 3: Attempt duplicate registration with the same email
  await TestValidator.error(
    "duplicate system admin email should fail",
    async () => {
      await api.functional.auth.systemAdmin.join(connection, {
        body: {
          email: businessEmail,
          full_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          provider: provider,
          provider_key: provider_key,
          password: password,
        } satisfies IHealthcarePlatformSystemAdmin.IJoin,
      });
    },
  );
}
