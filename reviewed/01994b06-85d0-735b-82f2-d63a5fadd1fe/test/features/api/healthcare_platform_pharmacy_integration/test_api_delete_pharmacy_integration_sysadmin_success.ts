import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test that a system admin can successfully delete a pharmacy integration.
 *
 * Steps:
 *
 * 1. System admin joins using business email, full name, and password.
 * 2. System admin logs in to obtain authentication.
 * 3. System admin creates a new pharmacy integration record (with random
 *    details).
 * 4. System admin deletes the pharmacy integration by ID (should succeed, no
 *    error thrown).
 * 5. System admin attempts to delete the same pharmacy integration again and
 *    expects an error.
 * 6. System admin attempts to delete a completely non-existent integration ID
 *    and expects an error.
 *
 * This test verifies the business rule that soft-deleting a pharmacy
 * integration removes it from further access, and handles errors for
 * already-deleted and non-existent resources. All necessary account and
 * integration setup is performed as part of the test.
 */
export async function test_api_delete_pharmacy_integration_sysadmin_success(
  connection: api.IConnection,
) {
  // 1. System admin join (create superuser)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. System admin login
  const adminLoginBody = {
    email: adminJoinBody.email,
    provider: "local",
    provider_key: adminJoinBody.provider_key,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminAuth = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminAuth);

  // 3. Create pharmacy integration
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const integrationCreate = {
    healthcare_platform_organization_id: orgId,
    pharmacy_vendor_code: RandomGenerator.alphabets(8),
    connection_uri: `https://pharmacy-${RandomGenerator.alphaNumeric(8)}.test/api`,
    supported_protocol: RandomGenerator.pick(["NCPDP", "FHIR", "HL7"] as const),
    status: RandomGenerator.pick([
      "active",
      "pending",
      "failed",
      "disabled",
    ] as const),
  } satisfies IHealthcarePlatformPharmacyIntegration.ICreate;
  const integration =
    await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.create(
      connection,
      { body: integrationCreate },
    );
  typia.assert(integration);

  // 4. Delete pharmacy integration
  await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.erase(
    connection,
    {
      pharmacyIntegrationId: integration.id,
    },
  );

  // 5. Attempt to delete again - should error
  await TestValidator.error(
    "deleting already deleted pharmacy integration should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.erase(
        connection,
        {
          pharmacyIntegrationId: integration.id,
        },
      );
    },
  );

  // 6. Attempt to delete non-existent integration - should error
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent pharmacy integration should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.erase(
        connection,
        {
          pharmacyIntegrationId: fakeId,
        },
      );
    },
  );
}
