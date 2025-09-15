import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsIntegrationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsIntegrationSetting";
import type { IEnterpriseLmsIntegrationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsIntegrationSettings";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsIntegrationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsIntegrationSetting";

/**
 * Test suite to verify the search and filtering capabilities of integration
 * settings from the system administrator perspective.
 *
 * Includes tests for creating system admin and tenant, adding integration
 * settings, and performing complex search queries with pagination and
 * sorting.
 *
 * Validates proper multi-tenant data isolation, system admin authorization,
 * and correct pagination metadata responses.
 *
 * Ensures error handling for unauthorized requests.
 */
export async function test_api_integration_settings_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create and authenticate system admin user.
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPasswordHash = RandomGenerator.alphaNumeric(64); // simulate a hashed password

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPasswordHash,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // 2. Create a tenant organization
  const tenantCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const tenantName = RandomGenerator.name(2);

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: tenantCode,
        name: tenantName,
      } satisfies IEnterpriseLmsTenant.ICreate,
    });
  typia.assert(tenant);
  TestValidator.predicate(
    "tenant code is uppercase",
    tenant.code === tenantCode,
  );

  // 3. Create multiple integration settings for the tenant
  const integrationSettingsInput: IEnterpriseLmsIntegrationSettings.ICreate[] =
    [
      {
        tenant_id: tenant.id,
        integration_name: "Stripe",
        config_key: "stripe_api_key",
        config_value: "sk_test_abcdefg",
        enabled: true,
      },
      {
        tenant_id: tenant.id,
        integration_name: "SendGrid",
        config_key: "sendgrid_api_key",
        config_value: "SG.abcdefg",
        enabled: false,
      },
      {
        tenant_id: tenant.id,
        integration_name: "Mixpanel",
        config_key: "mixpanel_token",
        config_value: "token_123456",
        enabled: true,
      },
    ];

  const createdIntegrationSettings: IEnterpriseLmsIntegrationSettings[] = [];

  for (const input of integrationSettingsInput) {
    const created =
      await api.functional.enterpriseLms.systemAdmin.integrationSettings.create(
        connection,
        { body: input },
      );
    typia.assert(created);
    createdIntegrationSettings.push(created);
  }

  // 4a. Search for enabled integration settings sorted ascending by integration_name
  const searchRequestEnabled: IEnterpriseLmsIntegrationSetting.IRequest = {
    integration_name: null,
    config_key: null,
    enabled: true,
    page: 1,
    limit: 10,
    sort_key: "integration_name",
    sort_direction: "asc",
  };

  const searchResultEnabled =
    await api.functional.enterpriseLms.systemAdmin.integrationSettings.index(
      connection,
      { body: searchRequestEnabled },
    );
  typia.assert(searchResultEnabled);

  TestValidator.predicate(
    "all results enabled",
    searchResultEnabled.data.every((item) => item.enabled === true),
  );

  TestValidator.predicate(
    "sorted by integration_name ascending",
    searchResultEnabled.data.every(
      (item, i, arr) =>
        i === 0 || arr[i - 1].integration_name <= item.integration_name,
    ),
  );

  // 4b. Pagination test: page 1, limit 2
  const paginationRequest: IEnterpriseLmsIntegrationSetting.IRequest = {
    page: 1,
    limit: 2,
    integration_name: null,
    config_key: null,
    enabled: null,
    sort_key: null,
    sort_direction: null,
  };

  const paginationResult =
    await api.functional.enterpriseLms.systemAdmin.integrationSettings.index(
      connection,
      { body: paginationRequest },
    );
  typia.assert(paginationResult);

  TestValidator.equals(
    "pagination limit match",
    paginationResult.pagination.limit,
    2,
  );

  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );

  TestValidator.predicate(
    "pagination data count is not more than limit",
    paginationResult.data.length <= 2,
  );

  // 4c. Sorting by created_at descending
  const sortCreatedAtRequest: IEnterpriseLmsIntegrationSetting.IRequest = {
    integration_name: null,
    config_key: null,
    enabled: null,
    page: null,
    limit: null,
    sort_key: "created_at",
    sort_direction: "desc",
  };

  const sortCreatedAtResult =
    await api.functional.enterpriseLms.systemAdmin.integrationSettings.index(
      connection,
      { body: sortCreatedAtRequest },
    );
  typia.assert(sortCreatedAtResult);

  TestValidator.predicate(
    "sorted by created_at descending",
    sortCreatedAtResult.data.every(
      (item, i, arr) => i === 0 || arr[i - 1].created_at >= item.created_at,
    ),
  );

  // 4d. Unauthorized access test with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized access without token", async () => {
    await api.functional.enterpriseLms.systemAdmin.integrationSettings.index(
      unauthenticatedConnection,
      {
        body: {
          page: 1,
          limit: 10,
          integration_name: null,
          config_key: null,
          enabled: null,
          sort_key: null,
          sort_direction: null,
        } satisfies IEnterpriseLmsIntegrationSetting.IRequest,
      },
    );
  });
}
