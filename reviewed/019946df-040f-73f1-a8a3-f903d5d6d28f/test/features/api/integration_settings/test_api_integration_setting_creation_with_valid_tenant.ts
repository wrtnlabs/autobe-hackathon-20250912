import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsIntegrationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsIntegrationSettings";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

export async function test_api_integration_setting_creation_with_valid_tenant(
  connection: api.IConnection,
) {
  // 1. Register system admin user and authenticate
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // 2. Create a tenant organization using admin auth
  const tenantCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreate,
    });
  typia.assert(tenant);

  // 3. Create an integration setting for the tenant
  const integrationSettingCreate = {
    tenant_id: tenant.id,
    integration_name: "Stripe",
    config_key: "api_key",
    config_value: RandomGenerator.alphaNumeric(32),
    enabled: true,
  } satisfies IEnterpriseLmsIntegrationSettings.ICreate;

  const integrationSetting: IEnterpriseLmsIntegrationSettings =
    await api.functional.enterpriseLms.systemAdmin.integrationSettings.create(
      connection,
      {
        body: integrationSettingCreate,
      },
    );
  typia.assert(integrationSetting);

  // Validate integration setting properties
  TestValidator.equals(
    "tenant_id matches",
    integrationSetting.tenant_id,
    tenant.id,
  );
  TestValidator.equals(
    "integration_name matches",
    integrationSetting.integration_name,
    integrationSettingCreate.integration_name,
  );
  TestValidator.equals(
    "config_key matches",
    integrationSetting.config_key,
    integrationSettingCreate.config_key,
  );
  TestValidator.equals(
    "config_value matches",
    integrationSetting.config_value,
    integrationSettingCreate.config_value,
  );
  TestValidator.equals(
    "enabled flags match",
    integrationSetting.enabled,
    integrationSettingCreate.enabled,
  );

  // Validate timestamps are non-null strings
  TestValidator.predicate(
    "created_at is valid date-time string",
    typeof integrationSetting.created_at === "string" &&
      integrationSetting.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time string",
    typeof integrationSetting.updated_at === "string" &&
      integrationSetting.updated_at.length > 0,
  );
}
