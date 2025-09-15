import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test the business and compliance logic for deletion of an insurance API
 * integration by system admin. Ensures correct authentication, integration
 * creation, deletion, and error handling.
 *
 * 1. Register and login as system admin
 * 2. Create an organization
 * 3. Create insurance API integration for the organization
 * 4. Delete the integration by its ID
 * 5. Attempt to delete the same integration again (should fail)
 * 6. Attempt to delete a random nonexistent ID (should fail)
 * 7. Attempt deletion without authentication (should be forbidden)
 */
export async function test_api_insurance_api_integration_delete_admin_authorized(
  connection: api.IConnection,
) {
  // Step 1. System Admin Join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(sysAdmin);

  // Step 2. System Admin Login (simulates a fresh session/token)
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminLogin);

  // Step 3. Create Organization
  const orgBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(organization);

  // Step 4. Create Insurance API Integration
  const integrationBody = {
    organization_id: organization.id,
    insurance_vendor_code: RandomGenerator.alphaNumeric(5),
    connection_uri: `https://api.${RandomGenerator.alphaNumeric(10)}.com`,
    supported_transaction_types: "eligibility,claims,realtime",
    status: "active",
  } satisfies IHealthcarePlatformInsuranceApiIntegration.ICreate;
  const integration =
    await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.create(
      connection,
      { body: integrationBody },
    );
  typia.assert(integration);

  // Step 5. Delete Insurance API Integration
  await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.erase(
    connection,
    {
      insuranceApiIntegrationId: integration.id,
    },
  );

  // Step 5a. Try to delete the integration again - expect not found error
  await TestValidator.error(
    "deleting already deleted integration should fail",
    async () =>
      await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.erase(
        connection,
        {
          insuranceApiIntegrationId: integration.id,
        },
      ),
  );

  // Step 5b. Try to delete a random nonexistent integration ID - expect not found error
  const randomNotExistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting nonexistent integration ID should fail",
    async () =>
      await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.erase(
        connection,
        {
          insuranceApiIntegrationId: randomNotExistId,
        },
      ),
  );

  // Step 6. Deletion without authentication: Create a separate unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "delete as unauthenticated should fail",
    async () =>
      await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.erase(
        unauthConn,
        {
          insuranceApiIntegrationId: integration.id,
        },
      ),
  );
}
