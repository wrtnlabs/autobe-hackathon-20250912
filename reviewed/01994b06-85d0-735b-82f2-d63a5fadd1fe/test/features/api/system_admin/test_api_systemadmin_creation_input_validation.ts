import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate the creation of system administrator users and proper input
 * validation.
 *
 * This scenario tests the creation of a new system admin (POST
 * /healthcarePlatform/systemAdmin/systemadmins), with correct audit,
 * uniqueness, permission enforcement, and schema-permitted fields.
 *
 * Steps:
 *
 * 1. Register and authenticate as initial system admin via /auth/systemAdmin/join.
 * 2. Create a valid admin with all required and optional fields via
 *    systemadmins.create.
 * 3. Verify returned admin profile matches input, with no sensitive credential
 *    fields.
 * 4. Attempt to create system admin with a duplicate email (expect error).
 * 5. Attempt to create with insufficient privileges (simulate non-admin context),
 *    expect permission error.
 */
export async function test_api_systemadmin_creation_input_validation(
  connection: api.IConnection,
) {
  // 1. Create and login initial system admin (bootstrap authentication)
  const initialEmail: string = `${RandomGenerator.alphaNumeric(8)}@corp-test.com`;
  const joinBody = {
    email: initialEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: initialEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const joined: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(joined);

  // 2. Create system admin with all fields
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}-a@corp-test.com`;
  const createAdminBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.ICreate;
  const admin =
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.create(
      connection,
      { body: createAdminBody },
    );
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals(
    "admin name matches",
    admin.full_name,
    createAdminBody.full_name,
  );
  TestValidator.equals(
    "admin phone matches",
    admin.phone,
    createAdminBody.phone,
  );

  // 3. Attempt to create another admin with duplicate email (should fail)
  await TestValidator.error("duplicate admin email should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.create(
      connection,
      {
        body: {
          email: adminEmail, // reuse existing email
          full_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformSystemAdmin.ICreate,
      },
    );
  });

  // 4. Attempt creation with unauthorized connection (simulate non-admin, i.e. unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized creation should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.create(
      unauthConn,
      {
        body: {
          email: `${RandomGenerator.alphaNumeric(8)}@corp-test.com`,
          full_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformSystemAdmin.ICreate,
      },
    );
  });

  // 5. Ensure response has no credential fields or sensitive info
  TestValidator.predicate(
    "no password or provider info in admin object",
    "password" in admin === false &&
      "provider" in admin === false &&
      "provider_key" in admin === false,
  );
  TestValidator.predicate(
    "admin response fields are schema-compliant",
    Object.keys(admin).every((field) =>
      [
        "id",
        "email",
        "full_name",
        "phone",
        "created_at",
        "updated_at",
        "deleted_at",
      ].includes(field),
    ),
  );
}
