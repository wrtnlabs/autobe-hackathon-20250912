import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a system admin can update pharmacy integration configuration by
 * pharmacyIntegrationId with new parameters. Also asserts audit field
 * preservation, role-based access for only admins, and correct error for
 * invalid integrationId.
 *
 * Steps:
 *
 * 1. Register a system admin (join)
 * 2. Create an organization
 * 3. Create a pharmacy integration for that org (collect pharmacyIntegrationId)
 * 4. Update the integration with new values for connection_uri, status, and
 *    supported_protocol
 * 5. Assert that response fields match new data and audit fields are updated
 * 6. Attempt update on a random invalid pharmacyIntegrationId and expect error
 * 7. Optional: Try updating as a non-admin and verify forbidden error (omitted due
 *    to lack of non-admin auth flows in DTO/API set)
 */
export async function test_api_pharmacy_integration_update_by_system_admin_with_org_scope(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const email = `${RandomGenerator.alphaNumeric(10)}@enterprise-company.com`;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);
  TestValidator.equals("joined sysAdmin email", sysAdmin.email, email);

  // 2. Create healthcare organization
  const orgBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(org);
  TestValidator.equals("org code", org.code, orgBody.code);

  // 3. Create pharmacy integration for that organization
  const pharmacyBody = {
    healthcare_platform_organization_id: org.id,
    pharmacy_vendor_code: RandomGenerator.alphaNumeric(7),
    connection_uri: `https://api.${RandomGenerator.name(1)}.pharmacy.test/v2`,
    supported_protocol: RandomGenerator.pick(["FHIR", "HL7", "NCPDP"] as const),
    status: RandomGenerator.pick(["active", "pending", "disabled"] as const),
  } satisfies IHealthcarePlatformPharmacyIntegration.ICreate;
  const pharmacy =
    await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.create(
      connection,
      { body: pharmacyBody },
    );
  typia.assert(pharmacy);
  TestValidator.equals(
    "integration org id",
    pharmacy.healthcare_platform_organization_id,
    org.id,
  );
  TestValidator.equals(
    "integration vendor code",
    pharmacy.pharmacy_vendor_code,
    pharmacyBody.pharmacy_vendor_code,
  );

  // 4. Update integration (change endpoint URI, status, protocol)
  const updateBody = {
    connection_uri: `https://updated.${RandomGenerator.name(1)}-pharm.net/v3`,
    status: RandomGenerator.pick(["active", "disabled"] as const),
    supported_protocol: RandomGenerator.pick(["FHIR", "HL7", "NCPDP"] as const),
    pharmacy_vendor_code: undefined, // not changing vendor code
  } satisfies IHealthcarePlatformPharmacyIntegration.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.update(
      connection,
      {
        pharmacyIntegrationId: pharmacy.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("updated integration id", updated.id, pharmacy.id);
  TestValidator.equals(
    "updated connection_uri",
    updated.connection_uri,
    updateBody.connection_uri,
  );
  TestValidator.equals("updated status", updated.status, updateBody.status);
  TestValidator.equals(
    "updated protocol",
    updated.supported_protocol,
    updateBody.supported_protocol,
  );
  // Audit: created_at should remain the same, updated_at should change
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    pharmacy.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    pharmacy.updated_at,
  );

  // 5. Negative path: update on non-existent ID
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("random pharmacyIntegrationId throws", async () => {
    await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.update(
      connection,
      {
        pharmacyIntegrationId: randomId,
        body: updateBody,
      },
    );
  });
}
