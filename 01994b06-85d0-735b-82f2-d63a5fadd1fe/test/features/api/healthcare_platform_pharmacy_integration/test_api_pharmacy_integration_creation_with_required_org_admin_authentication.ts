import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate organization admin pharmacy integration creation with full
 * multi-role context.
 *
 * 1. Register and login as system admin
 * 2. Create a new healthcare organization
 * 3. Register and login as organization admin
 * 4. As org admin, create a new pharmacy integration referencing the organization
 * 5. Verify creation and properties
 * 6. Attempt duplicate integration and validate error
 */
export async function test_api_pharmacy_integration_creation_with_required_org_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail =
    RandomGenerator.name(2).replace(/ /g, ".") + "@sysadmin.e2e.com";
  const sysAdminPassword = RandomGenerator.alphaNumeric(15);
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail as string,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);
  // 2. Login as system admin (in case token refresh needed)
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysAdminEmail as string & tags.Format<"email">,
        provider: "local",
        provider_key: sysAdminEmail as string,
        password: sysAdminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminLogin);
  // 3. Create organization
  const orgCode = RandomGenerator.alphaNumeric(10);
  const orgCreate =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(orgCreate);
  // 4. Register org admin
  const orgAdminEmail =
    RandomGenerator.name(2).replace(/ /g, ".") + "@orgadmin.e2e.com";
  const orgAdminPassword = RandomGenerator.alphaNumeric(16);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail as string & tags.Format<"email">,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail as string,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);
  // 5. Login as org admin
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail as string & tags.Format<"email">,
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail as string,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminLogin);
  // 6. As organization admin, create pharmacy integration for the organization
  // Satisfies: IHealthcarePlatformPharmacyIntegration.ICreate required fields
  const pharmacyVendorCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const connectionUri =
    "https://pharmacy-" +
    pharmacyVendorCode.toLowerCase() +
    ".e2ehealth.com/api";
  const supportedProtocol = RandomGenerator.pick([
    "NCPDP",
    "FHIR",
    "HL7",
  ] as const);
  const status = RandomGenerator.pick([
    "active",
    "pending",
    "failed",
    "disabled",
  ] as const);
  const createBody = {
    healthcare_platform_organization_id: orgCreate.id,
    pharmacy_vendor_code: pharmacyVendorCode,
    connection_uri: connectionUri,
    supported_protocol: supportedProtocol,
    status,
  } satisfies IHealthcarePlatformPharmacyIntegration.ICreate;

  const integration =
    await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.create(
      connection,
      { body: createBody },
    );
  typia.assert(integration);
  // 7. Validate all config fields
  TestValidator.equals(
    "integration org id matches",
    integration.healthcare_platform_organization_id,
    orgCreate.id,
  );
  TestValidator.equals(
    "integration vendor code matches",
    integration.pharmacy_vendor_code,
    pharmacyVendorCode,
  );
  TestValidator.equals(
    "integration connection_uri matches",
    integration.connection_uri,
    connectionUri,
  );
  TestValidator.equals(
    "integration supported_protocol matches",
    integration.supported_protocol,
    supportedProtocol,
  );
  TestValidator.equals(
    "integration status matches",
    integration.status,
    status,
  );
  // Audit: Timestamps are set
  TestValidator.predicate(
    "integration has created_at",
    typeof integration.created_at === "string" &&
      integration.created_at.length > 0,
  );
  TestValidator.predicate(
    "integration has updated_at",
    typeof integration.updated_at === "string" &&
      integration.updated_at.length > 0,
  );
  // 8. Duplicate create should error
  await TestValidator.error(
    "duplicate pharmacyVendorCode for same org errors",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.create(
        connection,
        { body: createBody },
      );
    },
  );
}
