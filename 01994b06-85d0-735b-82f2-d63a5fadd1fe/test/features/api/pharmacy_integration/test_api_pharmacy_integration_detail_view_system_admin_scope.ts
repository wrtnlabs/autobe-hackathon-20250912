import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that system admin can retrieve and view pharmacy integration
 * configuration details, and boundary errors are properly enforced.
 *
 * 1. Register system admin via join (with email, name, provider: 'local',
 *    password).
 * 2. Login as system admin for token-based access.
 * 3. Prepare a pharmacy integration entity directly (simulate creation, random
 *    instance).
 * 4. Fetch pharmacy integration details as system admin by ID.
 * 5. Validate all returned fields are present and correct.
 * 6. Attempt access with invalid/nonexistent ID (should error 404).
 * 7. Attempt access without token (expect forbidden / error).
 */
export async function test_api_pharmacy_integration_detail_view_system_admin_scope(
  connection: api.IConnection,
) {
  // 1. System admin registration
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: RandomGenerator.name(1) + "@enterprise-corp.com",
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: RandomGenerator.name(1),
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);
  const adminEmail = sysAdminJoin.email;
  const adminProviderKey = sysAdminJoin.email; // For local, provider_key is typically email

  // 2. System admin login (with saved password)
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        provider: "local",
        provider_key: adminProviderKey,
        password: sysAdminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminLogin);

  // 3. Prepare pharmacy integration (simulate create)
  const integration: IHealthcarePlatformPharmacyIntegration =
    typia.random<IHealthcarePlatformPharmacyIntegration>();

  // 4. Fetch integration detail
  const read =
    await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.at(
      connection,
      {
        pharmacyIntegrationId: integration.id,
      },
    );
  typia.assert(read);
  TestValidator.equals(
    "pharmacy integration id should match",
    read.id,
    integration.id,
  );
  TestValidator.equals(
    "pharmacy vendor code should match",
    read.pharmacy_vendor_code,
    integration.pharmacy_vendor_code,
  );
  TestValidator.equals(
    "integration organization id should match",
    read.healthcare_platform_organization_id,
    integration.healthcare_platform_organization_id,
  );

  // 5. Negative test: invalid UUID (random uuid unlikely to exist)
  await TestValidator.error(
    "404 not found for non-existent integration id",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.at(
        connection,
        {
          pharmacyIntegrationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Negative test: unauthenticated (clear token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "forbidden if not logged in as system admin",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.at(
        unauthConn,
        {
          pharmacyIntegrationId: integration.id,
        },
      );
    },
  );
}
