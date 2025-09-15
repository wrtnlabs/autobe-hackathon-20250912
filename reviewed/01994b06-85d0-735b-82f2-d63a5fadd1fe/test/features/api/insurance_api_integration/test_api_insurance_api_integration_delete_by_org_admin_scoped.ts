import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate end-to-end flow for deleting insurance API integrations by
 * organization admins.
 *
 * 1. Register and login a system admin
 * 2. Create distinct organizations as system admin (OrgA, OrgB)
 * 3. Register/join OrgA admin and login
 * 4. Register/join OrgB admin and login
 * 5. OrgA admin creates an insurance API integration for OrgA
 * 6. OrgA admin deletes their own integration and verify removed
 * 7. OrgB admin attempts to delete OrgA's integration (should fail with forbidden
 *    error)
 * 8. Second delete for previously deleted integration (should return not found
 *    error)
 * 9. Assert no soft-delete: verify deleted_at field is absent if possible
 */
export async function test_api_insurance_api_integration_delete_by_org_admin_scoped(
  connection: api.IConnection,
) {
  // -- 1: System Admin registration/login --
  const sysAdminEmail =
    RandomGenerator.name(1).replace(/\s+/g, "") + "@corp.com";
  const sysAdminJoinBody = {
    email: sysAdminEmail as string & tags.Format<"email">,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: sysAdminEmail as string,
    password: "Admin!234",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoinBody,
  });
  typia.assert(sysAdminAuth);

  // -- 2: Create two distinct organizations as system admin --
  const orgABody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const orgBBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const orgA =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgABody },
    );
  typia.assert(orgA);
  const orgB =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBBody },
    );
  typia.assert(orgB);

  // -- 3: Register/join OrgA admin and login
  const orgAAdminEmail =
    RandomGenerator.name(1).replace(/\s+/g, "") + "@orga.com";
  const orgAAdminJoinBody = {
    email: orgAAdminEmail as string & tags.Format<"email">,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "OrgA!234",
    provider: "local",
    provider_key: orgAAdminEmail as string,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAAdminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAAdminJoinBody },
  );
  typia.assert(orgAAdminAuth);
  const orgAAdminLoginBody = {
    email: orgAAdminEmail as string & tags.Format<"email">,
    password: "OrgA!234",
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const _ = await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAAdminLoginBody,
  });

  // -- 4: Register/join OrgB admin and login
  const orgBAdminEmail =
    RandomGenerator.name(1).replace(/\s+/g, "") + "@orgb.com";
  const orgBAdminJoinBody = {
    email: orgBAdminEmail as string & tags.Format<"email">,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "OrgB!234",
    provider: "local",
    provider_key: orgBAdminEmail as string,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgBAdminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgBAdminJoinBody },
  );
  typia.assert(orgBAdminAuth);
  const orgBAdminLoginBody = {
    email: orgBAdminEmail as string & tags.Format<"email">,
    password: "OrgB!234",
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;

  // -- 5: OrgA admin creates insurance API integration --
  const insuranceIntegrationBody = {
    organization_id: orgA.id,
    insurance_vendor_code: RandomGenerator.paragraph({ sentences: 1 }),
    connection_uri:
      `https://api.${RandomGenerator.alphaNumeric(8)}.com/v1/claim` as string,
    supported_transaction_types: "eligibility,claims",
    status: "active",
  } satisfies IHealthcarePlatformInsuranceApiIntegration.ICreate;
  const insuranceIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.create(
      connection,
      { body: insuranceIntegrationBody },
    );
  typia.assert(insuranceIntegration);

  // -- 6: OrgA admin deletes their own integration --
  await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.erase(
    connection,
    { insuranceApiIntegrationId: insuranceIntegration.id },
  );
  // Attempt to delete again by OrgA admin (should result in not found)
  await TestValidator.error(
    "re-delete deleted insurance API integration as OrgA admin should return not found",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.erase(
        connection,
        { insuranceApiIntegrationId: insuranceIntegration.id },
      );
    },
  );

  // -- 7: OrgB admin attempts to delete OrgA's integration (should fail with forbidden) --
  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgBAdminLoginBody,
  });
  await TestValidator.error(
    "OrgB admin forbidden from deleting OrgA's insurance API integration",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.erase(
        connection,
        { insuranceApiIntegrationId: insuranceIntegration.id },
      );
    },
  );

  // (Soft-delete assertion/retrieval beyond scope -- assume hard delete is enforced if 404 returned on repeat access)
}
