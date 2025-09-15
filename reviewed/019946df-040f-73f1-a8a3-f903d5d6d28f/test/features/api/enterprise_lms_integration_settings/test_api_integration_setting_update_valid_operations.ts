import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsIntegrationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsIntegrationSettings";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * E2E Test scenario for integration settings update operation.
 *
 * This test carries out the following steps:
 *
 * 1. Create and authenticate a system admin user to obtain an authorized
 *    token.
 * 2. Create a tenant organization.
 * 3. Create an integration setting linked to the created tenant.
 * 4. Update the created integration setting with new enabled status,
 *    integration name, key, and config value.
 * 5. Verify the update response reflects the changes correctly.
 * 6. Attempt invalid update with a non-existent ID and assert failure.
 * 7. Attempt update without authentication and assert failure.
 *
 * Each step uses appropriate DTOs and type validations with typia.assert.
 * Assertions validate business logic adherence and data persistence.
 */
export async function test_api_integration_setting_update_valid_operations(
  connection: api.IConnection,
) {
  // 1. Create and authenticate system admin
  const systemAdminCreateBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Create a tenant
  const tenantCreateBody = {
    code: `code${RandomGenerator.alphaNumeric(5)}`,
    name: `${RandomGenerator.name(2)} Corporation`,
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 3. Create an integration setting for the tenant
  const integrationSettingCreateBody = {
    tenant_id: tenant.id,
    integration_name: "InitialIntegration",
    config_key: `initial_key_${RandomGenerator.alphaNumeric(8)}`,
    config_value: `initial_value_${RandomGenerator.alphaNumeric(10)}`,
    enabled: true,
  } satisfies IEnterpriseLmsIntegrationSettings.ICreate;

  const integrationSetting: IEnterpriseLmsIntegrationSettings =
    await api.functional.enterpriseLms.systemAdmin.integrationSettings.create(
      connection,
      { body: integrationSettingCreateBody },
    );
  typia.assert(integrationSetting);

  // 4. Update the integration setting
  const integrationSettingUpdateBody = {
    enabled: !integrationSetting.enabled,
    integration_name: "UpdatedIntegration",
    config_key: `updated_key_${RandomGenerator.alphaNumeric(8)}`,
    config_value: `updated_value_${RandomGenerator.alphaNumeric(10)}`,
  } satisfies IEnterpriseLmsIntegrationSettings.IUpdate;

  const updatedIntegrationSetting: IEnterpriseLmsIntegrationSettings =
    await api.functional.enterpriseLms.systemAdmin.integrationSettings.update(
      connection,
      {
        id: integrationSetting.id,
        body: integrationSettingUpdateBody,
      },
    );
  typia.assert(updatedIntegrationSetting);

  // 5. Verify the update is persisted correctly
  TestValidator.equals(
    "integration setting id remains the same",
    updatedIntegrationSetting.id,
    integrationSetting.id,
  );
  TestValidator.equals(
    "tenant id remains the same",
    updatedIntegrationSetting.tenant_id,
    tenant.id,
  );
  TestValidator.equals(
    "enabled status updated",
    updatedIntegrationSetting.enabled,
    integrationSettingUpdateBody.enabled,
  );
  TestValidator.equals(
    "integration name updated",
    updatedIntegrationSetting.integration_name,
    integrationSettingUpdateBody.integration_name,
  );
  TestValidator.equals(
    "config key updated",
    updatedIntegrationSetting.config_key,
    integrationSettingUpdateBody.config_key,
  );
  TestValidator.equals(
    "config value updated",
    updatedIntegrationSetting.config_value,
    integrationSettingUpdateBody.config_value,
  );

  // 6. Negative test: attempt update with invalid id
  await TestValidator.error(
    "update fails for non-existent integration setting id",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.integrationSettings.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: integrationSettingUpdateBody,
        },
      );
    },
  );

  // 7. Negative test: attempt update without authentication
  // Create a fresh connection with empty headers (no Authorization token)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("update fails when not authenticated", async () => {
    await api.functional.enterpriseLms.systemAdmin.integrationSettings.update(
      unauthenticatedConnection,
      {
        id: integrationSetting.id,
        body: integrationSettingUpdateBody,
      },
    );
  });
}
