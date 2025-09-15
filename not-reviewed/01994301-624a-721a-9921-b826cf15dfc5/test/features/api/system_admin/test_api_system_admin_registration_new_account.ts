import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate new system administrator registration via /auth/systemAdmin/join.
 *
 * 1. Register a new system admin with unique email, strong password, name, and
 *    super_admin flag (randomized true/false)
 * 2. Confirm successful response contains: unique id, email, name, super_admin,
 *    is_active=true, timestamps, null/undefined deleted_at, and a valid token
 *    (access, refresh, expiration fields)
 * 3. Attempt registration with the same email, expect registration failure
 *    (uniqueness validation)
 * 4. Attempt registration with a weak password (e.g., "1234"), expect password
 *    policy validation error
 */
export async function test_api_system_admin_registration_new_account(
  connection: api.IConnection,
) {
  // 1. Generate unique admin registration data
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminName: string = RandomGenerator.name();
  const strongPassword: string = RandomGenerator.alphaNumeric(12) + "!A1"; // Ensure sufficient complexity for policy
  const superAdmin: boolean = RandomGenerator.pick([true, false] as const);

  // 2. Register new system admin successfully
  const registerBody = {
    email: adminEmail,
    password: strongPassword,
    name: adminName,
    super_admin: superAdmin,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: registerBody,
    });
  typia.assert(admin);
  TestValidator.equals(
    "registered admin email matches input",
    admin.email,
    registerBody.email,
  );
  TestValidator.equals(
    "registered admin name matches input",
    admin.name,
    registerBody.name,
  );
  TestValidator.equals(
    "registered admin super_admin flag matches",
    admin.super_admin,
    registerBody.super_admin,
  );
  TestValidator.predicate("admin account is active", admin.is_active === true);
  TestValidator.equals(
    "admin deleted_at is null/undefined",
    admin.deleted_at,
    null,
  );
  typia.assert(admin.token);
  TestValidator.predicate(
    "access token is string",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is string",
    typeof admin.token.refresh === "string" && admin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is present",
    typeof admin.token.expired_at === "string" &&
      admin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration is present",
    typeof admin.token.refreshable_until === "string" &&
      admin.token.refreshable_until.length > 0,
  );

  // 3. Attempt to register with duplicate email (should fail)
  await TestValidator.error(
    "duplicate email registration is rejected",
    async () => {
      await api.functional.auth.systemAdmin.join(connection, {
        body: {
          email: registerBody.email,
          password: strongPassword,
          name: RandomGenerator.name(),
          super_admin: false,
        } satisfies IAtsRecruitmentSystemAdmin.ICreate,
      });
    },
  );

  // 4. Attempt to register with a weak password (should fail)
  const weakPassword: string = "1234";
  await TestValidator.error(
    "weak password is blocked by validation",
    async () => {
      await api.functional.auth.systemAdmin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: weakPassword,
          name: RandomGenerator.name(),
          super_admin: false,
        } satisfies IAtsRecruitmentSystemAdmin.ICreate,
      });
    },
  );
}
