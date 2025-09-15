import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserLicenseVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserLicenseVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformUserLicenseVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserLicenseVerification";

/**
 * E2E test for system admin license verification search with filter and
 * security checks.
 *
 * Steps:
 *
 * 1. Register a unique system admin with local provider (using valid business
 *    email and password)
 * 2. Login as the new admin
 * 3. Search license verifications with various valid filter combinations
 *    (organization_id, user_id)
 * 4. Search with random (likely non-existent) UUIDs as filters and expect empty
 *    results
 * 5. Attempt search with no authentication (should fail)
 * 6. Attempt login with invalid credentials (should fail)
 */
export async function test_api_license_verification_search_with_filters_and_security(
  connection: api.IConnection,
) {
  // 1. System admin registration with fresh, unique business email
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(8)}@biz-example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinResult = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    },
  );
  typia.assert(adminJoinResult);
  TestValidator.equals(
    "joined admin email matches",
    adminJoinResult.email,
    adminEmail,
  );
  const adminId = adminJoinResult.id;

  // 2. Login as system admin with correct credentials
  const adminLoginResult = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        provider: "local",
        provider_key: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(adminLoginResult);
  TestValidator.equals(
    "login admin id matches join",
    adminLoginResult.id,
    adminId,
  );

  // 3. Search with random organization_id and user_id (simulate both plausible and noise cases)
  const fakeOrganizationId = typia.random<string & tags.Format<"uuid">>();
  const fakeUserId = typia.random<string & tags.Format<"uuid">>();

  // a) Search with only organization_id (cannot check property match; just run and assert shape)
  const resultsByOrg =
    await api.functional.healthcarePlatform.systemAdmin.userLicenseVerifications.index(
      connection,
      {
        body: {
          organization_id: fakeOrganizationId,
          page: 1,
          page_size: 10,
        } satisfies IHealthcarePlatformUserLicenseVerification.IRequest,
      },
    );
  typia.assert(resultsByOrg);
  TestValidator.predicate(
    "license verifications search by org returns plausible results or empty list",
    Array.isArray(resultsByOrg.data),
  );

  // b) Search with only user_id
  const resultsByUser =
    await api.functional.healthcarePlatform.systemAdmin.userLicenseVerifications.index(
      connection,
      {
        body: {
          user_id: fakeUserId,
          page: 1,
          page_size: 10,
        } satisfies IHealthcarePlatformUserLicenseVerification.IRequest,
      },
    );
  typia.assert(resultsByUser);
  TestValidator.predicate(
    "license verifications filtered by user_id: empty or user matches",
    resultsByUser.data.length === 0 ||
      resultsByUser.data.every((l) => l.user_id === fakeUserId),
  );

  // c) Search with both filters - no noise: expect empty
  const jointResults =
    await api.functional.healthcarePlatform.systemAdmin.userLicenseVerifications.index(
      connection,
      {
        body: {
          user_id: fakeUserId,
          organization_id: fakeOrganizationId,
          page: 1,
          page_size: 10,
        } satisfies IHealthcarePlatformUserLicenseVerification.IRequest,
      },
    );
  typia.assert(jointResults);
  TestValidator.equals(
    "license verification search with non-existent filter pair returns empty",
    jointResults.data.length,
    0,
  );

  // 4. Search with no authentication (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthed system admin cannot perform license verification search",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userLicenseVerifications.index(
        unauthConn,
        {
          body: {
            page: 1,
            page_size: 1,
          } satisfies IHealthcarePlatformUserLicenseVerification.IRequest,
        },
      );
    },
  );

  // 5. Login attempt with invalid credentials (should fail)
  await TestValidator.error(
    "system admin login fails with wrong password",
    async () => {
      await api.functional.auth.systemAdmin.login(connection, {
        body: {
          email: adminEmail,
          provider: "local",
          provider_key: adminEmail,
          password: "wrongpassword12345",
        } satisfies IHealthcarePlatformSystemAdmin.ILogin,
      });
    },
  );
}
