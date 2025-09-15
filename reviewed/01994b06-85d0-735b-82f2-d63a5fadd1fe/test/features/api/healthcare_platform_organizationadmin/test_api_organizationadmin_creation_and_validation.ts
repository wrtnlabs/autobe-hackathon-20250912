import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate organization admin creation by a system administrator.
 *
 * End-to-end flow:
 *
 * 1. Register new system admin for privileged access.
 * 2. (Re-)Authenticate system admin if needed.
 * 3. As system admin, create organization admin via POST with required fields
 *    (email, full_name, optional phone).
 * 4. Validate that created organization admin has correct fields and values.
 * 5. Test uniqueness constraint: creating again with same email should fail.
 * 6. Test missing required fields: POST with missing email/full_name should fail.
 * 7. Test invalid email format: POST with invalid email should fail.
 */
export async function test_api_organizationadmin_creation_and_validation(
  connection: api.IConnection,
) {
  // 1. Register new system admin
  const sysadmin_email =
    `e2eadmin+${RandomGenerator.alphaNumeric(8)}@mycompany.com` as string &
      tags.Format<"email">;
  const sysadmin_password = RandomGenerator.alphaNumeric(16);
  const sysadmin_full_name = RandomGenerator.name();
  const sysadmin_provider = "local";

  const join_result = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadmin_email,
      full_name: sysadmin_full_name,
      provider: sysadmin_provider,
      provider_key: sysadmin_email,
      password: sysadmin_password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(join_result);

  // 2. (Re-)login system admin for a fresh session
  const login_result = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadmin_email,
      provider: sysadmin_provider,
      provider_key: sysadmin_email,
      password: sysadmin_password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(login_result);
  TestValidator.equals(
    "login system admin user id matches join result",
    login_result.id,
    join_result.id,
  );

  // 3. Create organization admin
  const org_admin_email = `orgadmin+${RandomGenerator.alphaNumeric(8)}@business-corp.com`;
  const org_admin_full_name = RandomGenerator.name();
  const org_admin_phone = RandomGenerator.mobile("+1");
  const org_admin_body = {
    email: org_admin_email,
    full_name: org_admin_full_name,
    phone: org_admin_phone,
  } satisfies IHealthcarePlatformOrganizationAdmin.ICreate;

  const org_admin_result =
    await api.functional.healthcarePlatform.systemAdmin.organizationadmins.create(
      connection,
      { body: org_admin_body },
    );
  typia.assert(org_admin_result);
  TestValidator.equals(
    "new org admin email matches input",
    org_admin_result.email,
    org_admin_email,
  );
  TestValidator.equals(
    "new org admin full name matches input",
    org_admin_result.full_name,
    org_admin_full_name,
  );
  TestValidator.equals(
    "new org admin phone matches input",
    org_admin_result.phone,
    org_admin_phone,
  );
  TestValidator.equals(
    "org admin deleted_at should be null or undefined",
    org_admin_result.deleted_at,
    null,
  );

  // 4. Test uniqueness: duplicate email should fail
  await TestValidator.error(
    "duplicate email should fail for org admin create",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizationadmins.create(
        connection,
        {
          body: {
            email: org_admin_email, // duplicate
            full_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile("+1"),
          } satisfies IHealthcarePlatformOrganizationAdmin.ICreate,
        },
      );
    },
  );

  // 5. Test missing required field (email)
  await TestValidator.error(
    "missing required email should fail org admin create",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizationadmins.create(
        connection,
        {
          body: {
            email: "",
            full_name: RandomGenerator.name(),
          } satisfies IHealthcarePlatformOrganizationAdmin.ICreate,
        },
      );
    },
  );

  // 6. Test missing required field (full_name)
  await TestValidator.error(
    "missing required full_name should fail org admin create",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizationadmins.create(
        connection,
        {
          body: {
            email: `orgadmin+${RandomGenerator.alphaNumeric(8)}@business-corp.com`,
            full_name: "",
          } satisfies IHealthcarePlatformOrganizationAdmin.ICreate,
        },
      );
    },
  );

  // 7. Test invalid email format
  await TestValidator.error(
    "invalid email format should fail org admin create",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizationadmins.create(
        connection,
        {
          body: {
            email: "not-an-email-format",
            full_name: RandomGenerator.name(),
          } satisfies IHealthcarePlatformOrganizationAdmin.ICreate,
        },
      );
    },
  );
}
