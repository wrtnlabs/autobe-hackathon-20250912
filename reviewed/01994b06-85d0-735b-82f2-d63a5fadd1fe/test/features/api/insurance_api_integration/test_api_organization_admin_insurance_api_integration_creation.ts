import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test the workflow for an organization admin to provision a new insurance API
 * integration.
 *
 * Validates:
 *
 * - Successful integration creation for correct organization by org admin.
 * - Enforcement of authentication/org assignment/privilege separation.
 * - Uniqueness and org boundary business logic errors.
 *
 * Workflow:
 *
 * 1. Organization admin join for OrgA
 * 2. Organization admin login as OrgA admin
 * 3. Create insurance API integration for OrgA
 * 4. Verify integration is successfully created, audit/assignment fields, business
 *    rules
 * 5. Try create with non-unique (org/vendor_code) (should fail)
 * 6. Try cross-org: admin for OrgB tries to create integration for OrgA (should
 *    fail)
 */
export async function test_api_organization_admin_insurance_api_integration_creation(
  connection: api.IConnection,
) {
  // 1. Organization admin join for OrgA
  const orgAEmail = typia.random<string & tags.Format<"email">>();
  const orgAFullName = RandomGenerator.name();
  const orgAJoin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAEmail,
        full_name: orgAFullName,
        password: "SecurePassw0rd!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAJoin);

  // 2. Admin login as OrgA admin (redundant as join sets token, but explicit)
  const orgALogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAEmail,
        password: "SecurePassw0rd!",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgALogin);

  const orgAId = orgALogin.id;

  // 3. Create insurance API integration for OrgA
  const integrationRequest = {
    organization_id: orgAId,
    insurance_vendor_code: RandomGenerator.name(1),
    connection_uri: "https://api.vendor.example.com/claims",
    supported_transaction_types: "eligibility,claims,realtime",
    status: "active",
  } satisfies IHealthcarePlatformInsuranceApiIntegration.ICreate;

  const integration =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.create(
      connection,
      {
        body: integrationRequest,
      },
    );
  typia.assert(integration);
  TestValidator.equals(
    "integration org id matches",
    integration.healthcare_platform_organization_id,
    orgAId,
  );
  TestValidator.equals(
    "vendor_code matches",
    integration.insurance_vendor_code,
    integrationRequest.insurance_vendor_code,
  );
  TestValidator.equals(
    "URI matches",
    integration.connection_uri,
    integrationRequest.connection_uri,
  );
  TestValidator.equals(
    "status matches input",
    integration.status,
    integrationRequest.status,
  );
  TestValidator.predicate(
    "audit fields populated",
    typeof integration.created_at === "string" &&
      typeof integration.updated_at === "string",
  );

  // 4. Uniqueness/test duplicate integration with same org/vendor code (should fail)
  await TestValidator.error(
    "cannot create duplicate integration (org + vendor_code)",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.create(
        connection,
        { body: integrationRequest },
      );
    },
  );

  // 5. Cross-org: create another orgAdmin and test org boundary
  const orgBEmail = typia.random<string & tags.Format<"email">>();
  const orgBName = RandomGenerator.name();
  const orgBJoin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgBEmail,
        full_name: orgBName,
        password: "AnotherPass!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgBJoin);
  // Login as orgB
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgBEmail,
      password: "AnotherPass!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // OrgB tries to create an integration for OrgA (should fail)
  await TestValidator.error(
    "org boundary enforced: orgB cannot provision integration for orgA",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.create(
        connection,
        {
          body: {
            ...integrationRequest,
            organization_id: orgAId,
          },
        },
      );
    },
  );
}
