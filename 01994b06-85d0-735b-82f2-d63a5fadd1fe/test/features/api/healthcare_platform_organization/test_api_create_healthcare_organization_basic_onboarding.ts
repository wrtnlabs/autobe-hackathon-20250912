import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate basic onboarding flow for healthcare organization creation via
 * systemAdmin API.
 *
 * 1. Register a new system admin (POST /auth/systemAdmin/join)
 * 2. Log in as system admin (POST /auth/systemAdmin/login)
 * 3. Create a new healthcare organization (POST
 *    /healthcarePlatform/systemAdmin/organizations)
 * 4. Confirm successful response with unique organization id (UUID)
 * 5. Attempt to create the same organization again (with duplicate code) and
 *    assert rejection
 * 6. Attempt to create an organization while unauthenticated and assert
 *    unauthorized
 */
export async function test_api_create_healthcare_organization_basic_onboarding(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  TestValidator.equals(
    "register system admin returns matching email",
    admin.email,
    adminEmail,
  );
  // 2. Log in as system admin
  const loginBody = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loggedIn: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);
  TestValidator.equals(
    "login returns matching system admin UUID",
    loggedIn.id,
    admin.id,
  );
  // 3. Create a new healthcare organization
  const orgCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const orgBody = {
    code: orgCode,
    name: `Test Org ${RandomGenerator.name(2)}`,
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(org);
  TestValidator.equals(
    "organization response id is UUID",
    typeof org.id,
    "string",
  );
  TestValidator.equals("organization code matches", org.code, orgCode);
  // 4. Duplicate creation must fail for code uniqueness
  await TestValidator.error(
    "duplicate organization code should cause error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizations.create(
        connection,
        { body: orgBody },
      );
    },
  );
  // 5. Creation should fail for unauthorized connection (simulate logout)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated org creation attempt fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizations.create(
        unauthConn,
        {
          body: {
            code: RandomGenerator.alphaNumeric(8).toUpperCase(),
            name: `Another Org ${RandomGenerator.name(2)}`,
            status: "active",
          } satisfies IHealthcarePlatformOrganization.ICreate,
        },
      );
    },
  );
}
