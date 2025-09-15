import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsIntegrationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsIntegrationSettings";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This scenario tests the retrieval of detailed information of an integration
 * setting by its unique ID for a system administrator of the Enterprise LMS.
 *
 * Business Context: The Enterprise LMS supports multi-tenant architecture where
 * system admins manage tenants and their integration settings.
 *
 * Test Steps:
 *
 * 1. The test starts by registering and authenticating as a system admin user,
 *    which establishes an authenticated session.
 * 2. The test creates a new tenant entity to associate with the integration
 *    setting.
 * 3. The test creates an integration setting linked to the newly created tenant,
 *    providing all required fields with realistic and valid values.
 * 4. Then, the test retrieves the created integration setting by its ID, ensuring
 *    the returned data exactly matches the created record, validating all
 *    fields for correctness.
 * 5. The test performs negative validation by attempting to retrieve an
 *    integration setting using an invalid UUID, expecting an error.
 * 6. Additionally, the test checks unauthorized access by attempting to retrieve
 *    the integration setting with no authentication (using a connection with
 *    empty headers), expecting an error.
 *
 * The test ensures that the retrieval endpoint rightly enforces authentication
 * and returns accurate data for valid requests.
 *
 * DTO Types Used:
 *
 * - IEnterpriseLmsSystemAdmin.ICreate for admin creation
 * - IEnterpriseLmsTenant.ICreate for tenant creation
 * - IEnterpriseLmsIntegrationSettings.ICreate for integration setting creation
 * - IEnterpriseLmsIntegrationSettings as the retrieval response type
 *
 * The test includes typia.assert() verification for all responses to ensure
 * type correctness.
 *
 * It uses TestValidator functions with descriptive titles for all equality and
 * error validations.
 *
 * Dependencies include admin join, tenant creation, and integration setting
 * creation, which are executed before or within this test function to set
 * context.
 *
 * All API calls have proper await usage and correct request shapes.
 *
 * Business logic and security expectations are fully validated.
 *
 * The overall flow mimics a real-world usage scenario for system admin
 * integration settings management.
 *
 * This test is crucial to ensure data integrity and access control for
 * sensitive integration configurations.
 */
export async function test_api_integration_setting_get_detail_by_id(
  connection: api.IConnection,
) {
  // 1. System admin sign up and authenticate
  const systemAdminPayload = {
    email: `admin_${RandomGenerator.alphaNumeric(5).toLowerCase()}@enterprise.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminPayload,
    });
  typia.assert(systemAdmin);

  // 2. Create a tenant entity
  const tenantPayload = {
    code: `tenant_${RandomGenerator.alphaNumeric(5).toLowerCase()}`,
    name: `${RandomGenerator.name(2)}`,
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantPayload,
    });
  typia.assert(tenant);

  // 3. Create an integration setting linked to the tenant
  const integrationSettingPayload = {
    tenant_id: tenant.id,
    integration_name: "ExampleIntegration",
    config_key: `cfg_${RandomGenerator.alphaNumeric(8)}`,
    config_value: `{"apiKey":"${RandomGenerator.alphaNumeric(32)}","endpoint":"https://api.example.com"}`,
    enabled: true,
  } satisfies IEnterpriseLmsIntegrationSettings.ICreate;

  const integrationSetting: IEnterpriseLmsIntegrationSettings =
    await api.functional.enterpriseLms.systemAdmin.integrationSettings.create(
      connection,
      {
        body: integrationSettingPayload,
      },
    );
  typia.assert(integrationSetting);

  // 4. Retrieve the integration setting by its ID
  const retrievedSetting: IEnterpriseLmsIntegrationSettings =
    await api.functional.enterpriseLms.systemAdmin.integrationSettings.at(
      connection,
      {
        id: integrationSetting.id,
      },
    );
  typia.assert(retrievedSetting);

  TestValidator.equals(
    "retrieved integration setting id",
    retrievedSetting.id,
    integrationSetting.id,
  );
  TestValidator.equals(
    "retrieved integration setting tenant_id",
    retrievedSetting.tenant_id,
    integrationSetting.tenant_id,
  );
  TestValidator.equals(
    "retrieved integration setting integration_name",
    retrievedSetting.integration_name,
    integrationSetting.integration_name,
  );
  TestValidator.equals(
    "retrieved integration setting config_key",
    retrievedSetting.config_key,
    integrationSetting.config_key,
  );
  TestValidator.equals(
    "retrieved integration setting config_value",
    retrievedSetting.config_value,
    integrationSetting.config_value ?? null,
  );
  TestValidator.equals(
    "retrieved integration setting enabled",
    retrievedSetting.enabled,
    integrationSetting.enabled,
  );

  // 5. Negative test: retrieving with invalid ID
  await TestValidator.error(
    "retrieving integration setting with invalid ID fails",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.integrationSettings.at(
        connection,
        {
          id: "00000000-0000-0000-0000-000000000000" satisfies string &
            tags.Format<"uuid">,
        },
      );
    },
  );

  // 6. Negative test: unauthorized access
  // Create an unauthenticated connection by clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized retrieval of integration setting fails",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.integrationSettings.at(
        unauthenticatedConnection,
        {
          id: integrationSetting.id,
        },
      );
    },
  );
}
