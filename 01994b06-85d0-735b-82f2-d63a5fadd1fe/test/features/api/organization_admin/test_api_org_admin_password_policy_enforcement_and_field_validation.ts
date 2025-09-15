import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate password policy enforcement and required field checking during org
 * admin registration.
 *
 * 1. Attempt to register with an invalid (weak) password - expect business logic
 *    error due to password policy.
 * 2. Attempt successful registration with all required and strong password fields.
 * 3. Every join failure should not result in an admin account creation. (Testing
 *    missing required fields is omitted, as TypeScript prohibits such calls.)
 */
export async function test_api_org_admin_password_policy_enforcement_and_field_validation(
  connection: api.IConnection,
) {
  // 1. Attempt registration with invalid password (e.g., too short)
  await TestValidator.error(
    "should fail to register admin with invalid password (complexity)",
    async () => {
      await api.functional.auth.organizationAdmin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          password: "123", // Too short, does not meet policy
        } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
      });
    },
  );
  // 2. Attempt registration with valid data (positive control)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches input",
    admin.email,
    joinBody.email,
  );
  TestValidator.equals(
    "admin full_name matches input",
    admin.full_name,
    joinBody.full_name,
  );
}
