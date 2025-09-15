import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test the creation of a new healthcare organization by a system admin.
 *
 * Steps:
 *
 * 1. Register and log in as a system admin.
 * 2. Create a new organization with valid code, name, and status.
 * 3. Assert the organization was created correctly.
 * 4. Attempt to create a duplicate organization (same code) and expect error.
 * 5. Attempt to create with invalid status and expect error.
 * 6. Attempt to create as unauthorized user and expect error.
 */
export async function test_api_organization_creation_success_and_duplicate(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const fullName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: fullName,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);
  TestValidator.equals("admin email matches", adminJoin.email, adminEmail);

  // 2. Log in (refresh context)
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Create org with unique code
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name(2);
  const orgStatus = "active";
  const orgBody = {
    code: orgCode,
    name: orgName,
    status: orgStatus,
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(org);
  TestValidator.equals("organization code matches", org.code, orgCode);
  TestValidator.equals("organization name matches", org.name, orgName);
  TestValidator.equals("organization status matches", org.status, orgStatus);

  // 4. Duplicate code
  await TestValidator.error("duplicate organization code error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  });

  // 5. Invalid status (empty string)
  await TestValidator.error("invalid status error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(2),
          status: "", // empty not allowed
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  });

  // 6. Unauthorized - try create without login
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized organization creation", async () => {
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      unauthConn,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(2),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  });
}
