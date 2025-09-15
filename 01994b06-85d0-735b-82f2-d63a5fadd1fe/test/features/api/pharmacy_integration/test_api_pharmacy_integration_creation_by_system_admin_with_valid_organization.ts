import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates system admin can create a pharmacy integration with a valid
 * organization and handles errors for edge cases.
 *
 * Steps:
 *
 * 1. Register/login as system admin.
 * 2. Create a valid organization.
 * 3. Successfully create pharmacy integration.
 * 4. Attempt duplicate vendor code for the same org (should error).
 * 5. Attempt invalid protocol (should error).
 */
export async function test_api_pharmacy_integration_creation_by_system_admin_with_valid_organization(
  connection: api.IConnection,
) {
  // 1. Join as system admin
  const email: string = typia.random<string & tags.Format<"email">>();
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: email,
        password: RandomGenerator.alphaNumeric(16),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(sysAdmin);
  TestValidator.equals(
    "system admin email matches requested",
    sysAdmin.email,
    email,
  );
  TestValidator.predicate(
    "admin UUID is present",
    typeof sysAdmin.id === "string" && sysAdmin.id.length > 0,
  );
  TestValidator.predicate(
    "JWT access token present",
    typeof sysAdmin.token?.access === "string" &&
      sysAdmin.token.access.length > 0,
  );

  // 2. Create a new organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name(2);
  const org: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);
  TestValidator.equals("organization code matches", org.code, orgCode);
  TestValidator.equals("organization name matches", org.name, orgName);
  TestValidator.equals("organization status is active", org.status, "active");

  // 3. Create pharmacy integration successfully
  const vendorCode = RandomGenerator.alphaNumeric(10);
  const connUri = `https://${RandomGenerator.alphaNumeric(8)}.pharmacy.example.com/api`;
  const protocol = RandomGenerator.pick(["NCPDP", "FHIR"] as const);
  const status = RandomGenerator.pick(["active", "pending"] as const);
  const pharmInput = {
    healthcare_platform_organization_id: org.id,
    pharmacy_vendor_code: vendorCode,
    connection_uri: connUri,
    supported_protocol: protocol,
    status,
  } satisfies IHealthcarePlatformPharmacyIntegration.ICreate;
  const pharmacy: IHealthcarePlatformPharmacyIntegration =
    await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.create(
      connection,
      {
        body: pharmInput,
      },
    );
  typia.assert(pharmacy);
  TestValidator.equals(
    "pharmacy integration's org_id matches",
    pharmacy.healthcare_platform_organization_id,
    org.id,
  );
  TestValidator.equals(
    "pharmacy_vendor_code matches",
    pharmacy.pharmacy_vendor_code,
    vendorCode,
  );
  TestValidator.equals(
    "protocol matches",
    pharmacy.supported_protocol,
    protocol,
  );
  TestValidator.equals("status matches", pharmacy.status, status);
  TestValidator.predicate(
    "created_at is present",
    typeof pharmacy.created_at === "string" && pharmacy.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof pharmacy.updated_at === "string" && pharmacy.updated_at.length > 0,
  );
  TestValidator.predicate(
    "ID looks like UUID",
    typeof pharmacy.id === "string" && pharmacy.id.length > 0,
  );

  // 4. Duplicate vendor code for same org
  await TestValidator.error(
    "should fail: duplicate vendor code (same org)",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: org.id,
            pharmacy_vendor_code: vendorCode,
            connection_uri: `https://${RandomGenerator.alphaNumeric(8)}.pharmacy.example.com/api`,
            supported_protocol: protocol,
            status,
          } satisfies IHealthcarePlatformPharmacyIntegration.ICreate,
        },
      );
    },
  );

  // 5. Invalid protocol type
  await TestValidator.error(
    "should fail: unsupported protocol type",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: org.id,
            pharmacy_vendor_code: RandomGenerator.alphaNumeric(10),
            connection_uri: `https://${RandomGenerator.alphaNumeric(8)}.pharmacy.example.com/api`,
            supported_protocol: "XYZ_UNSUPPORTED_PROTO",
            status,
          } satisfies IHealthcarePlatformPharmacyIntegration.ICreate,
        },
      );
    },
  );
}
