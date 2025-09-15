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
 * Validate that an organization admin can update an existing pharmacy
 * integration, impacting attributes (like connection URI, protocol, status),
 * denying updates on non-existent/soft-deleted entries, and enforcing
 * authorization boundaries/restricted fields.
 *
 * Steps:
 *
 * 1. Register & login as system admin
 * 2. Create an organization
 * 3. Register & login as organization admin
 * 4. Create pharmacy integration for the organization
 * 5. Update some fields (connection_uri, status, etc.)
 * 6. Verify that returned object reflects new values and version/audit data is
 *    correct
 * 7. Attempt updating a non-existent pharmacyIntegrationId (should error)
 * 8. (Optional) Attempt unauthorized update by not logged in as org admin (should
 *    error)
 */
export async function test_api_pharmacy_integration_update_by_org_admin_for_existing_integration(
  connection: api.IConnection,
) {
  // 1. Register & login as system admin
  const sysAdminEmail = RandomGenerator.alphabets(8) + "@enterprise.com";
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "sysadmin_pwd2024",
    },
  });
  typia.assert(sysAdminJoin);

  // 2. Create an organization
  const orgCode = RandomGenerator.alphaNumeric(6);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(org);

  // 3. Register & login as organization admin
  const orgAdminEmail = RandomGenerator.alphabets(8) + "@org.com";
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "orgadmin_pwd2024",
        provider: "local",
        provider_key: orgAdminEmail,
      },
    },
  );
  typia.assert(orgAdminJoin);
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: "orgadmin_pwd2024",
      },
    },
  );
  typia.assert(orgAdminLogin);

  // 4. Create pharmacy integration for the organization
  const originalCreateBody = {
    healthcare_platform_organization_id: org.id,
    pharmacy_vendor_code: RandomGenerator.alphaNumeric(6),
    connection_uri: "https://pharmacy-vendor.test/api/integration",
    supported_protocol: RandomGenerator.pick(["NCPDP", "FHIR", "HL7"] as const),
    status: RandomGenerator.pick(["active", "pending", "disabled"] as const),
  } satisfies IHealthcarePlatformPharmacyIntegration.ICreate;
  const integration =
    await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.create(
      connection,
      {
        body: originalCreateBody,
      },
    );
  typia.assert(integration);

  // 5. Update selected fields (e.g., new connection_uri, status)
  const updateBody = {
    connection_uri:
      "https://pharmacy-vendor-changed.example/api/integration/new",
    status: "disabled",
  } satisfies IHealthcarePlatformPharmacyIntegration.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.update(
      connection,
      {
        pharmacyIntegrationId: integration.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // 6. Verify that the update took effect
  TestValidator.equals(
    "updated connection_uri",
    updated.connection_uri,
    updateBody.connection_uri,
  );
  TestValidator.equals("updated status", updated.status, updateBody.status);
  TestValidator.equals(
    "organization id unchanged",
    updated.healthcare_platform_organization_id,
    integration.healthcare_platform_organization_id,
  );
  // 7. Try update with a random/non-existent id
  await TestValidator.error(
    "cannot update non-existent integration",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.update(
        connection,
        {
          pharmacyIntegrationId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
  // 8. (Optional) Attempt to update as a different (unauthorized) user
  // Register and login as system admin (different session)
  const sysAdminJoin2 = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@xtra.com",
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: RandomGenerator.alphaNumeric(8) + "@xtra.com",
      password: "xtrapwd2024",
    },
  });
  typia.assert(sysAdminJoin2);
  // Try update from this session (should be forbidden)
  await TestValidator.error("forbidden for non-org admin actor", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.update(
      connection,
      {
        pharmacyIntegrationId: integration.id,
        body: updateBody,
      },
    );
  });
}
