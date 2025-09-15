import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import type { IEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenantSettings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsTenantSettings";

/**
 * Validate the search and pagination of tenant settings for a tenant.
 *
 * This ensures organizationAdmin role can authenticate, create a tenant, create
 * multiple tenant settings with varied attributes, then perform filtered
 * paginated searches by brand colors, domains, and creation dates. It confirms
 * correct response contents, pagination metadata, and error handling for
 * invalid filters.
 *
 * The test maintains required tenant data isolation and role access.
 */
export async function test_api_tenant_setting_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Authenticate as organizationAdmin
  const orgAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: orgAdminEmail,
        password: "OrgAdmin#1",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdmin);

  // 2. Create tenant
  const tenantCode = `tnt${RandomGenerator.alphaNumeric(8)}`;
  const tenantName = `Tenant ${RandomGenerator.name(2)}`;
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: tenantCode,
        name: tenantName,
      } satisfies IEnterpriseLmsTenant.ICreate,
    });
  typia.assert(tenant);

  // 3. Create multiple tenant settings with varied branding colors, domains
  const spreadBrandColors = [
    ["#FF5733", "#33FF57"],
    ["#33AAFF", "#FF33AA"],
    ["#112233", "#445566"],
    ["#AABBCC", "#DDEEFF"],
  ];

  const domains = [
    "tenant.example.com",
    "org.example.com",
    "company.example.net",
    "enterprise.example.org",
  ];

  const cssSnippets = [
    "body { background-color: #fff; }",
    "h1 { color: #333; }",
    "a { text-decoration: none; }",
    "p { font-size: 14px; }",
  ];

  const tenantSettingsList: IEnterpriseLmsTenantSettings[] = [];

  await ArrayUtil.asyncForEach(
    spreadBrandColors,
    async ([primary, secondary], i) => {
      const created: IEnterpriseLmsTenantSettings =
        await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.create(
          connection,
          {
            tenantId: tenant.id,
            body: {
              enterprise_lms_tenant_id: tenant.id,
              branding_logo_uri: null,
              branding_color_primary: primary,
              branding_color_secondary: secondary,
              custom_domain: domains[i],
              css_overrides: cssSnippets[i],
            } satisfies IEnterpriseLmsTenantSettings.ICreate,
          },
        );
      typia.assert(created);
      tenantSettingsList.push(created);
    },
  );

  // 4. Perform filtered paginated search - page 1
  const searchRequestPage1 = {
    page: 1,
    limit: 2,
    branding_color_primary:
      tenantSettingsList[0].branding_color_primary ?? undefined,
    branding_color_secondary: undefined,
    custom_domain: undefined,
    created_from: null,
    created_to: null,
    order_by: "created_at",
    order_dir: "asc",
  } satisfies IEnterpriseLmsTenantSettings.IRequest;

  const searchResultPage1: IPageIEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.index(
      connection,
      {
        tenantId: tenant.id,
        body: searchRequestPage1,
      },
    );
  typia.assert(searchResultPage1);

  // Validate pagination metadata for page 1
  TestValidator.predicate(
    "pagination current page equals 1",
    searchResultPage1.pagination.current === 1,
  );
  TestValidator.equals(
    "pagination limit equals 2",
    searchResultPage1.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination total records greater or equal to length",
    searchResultPage1.pagination.records >= searchResultPage1.data.length,
  );

  // Validate all records have the filtered primary branding color
  for (const setting of searchResultPage1.data) {
    TestValidator.equals(
      "setting branding_color_primary matches filter",
      setting.branding_color_primary,
      tenantSettingsList[0].branding_color_primary,
    );
  }

  // 5. Perform filtered paginated search - page 2
  const searchRequestPage2 = {
    ...searchRequestPage1,
    page: 2,
  } satisfies IEnterpriseLmsTenantSettings.IRequest;

  const searchResultPage2: IPageIEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.index(
      connection,
      {
        tenantId: tenant.id,
        body: searchRequestPage2,
      },
    );
  typia.assert(searchResultPage2);

  TestValidator.predicate(
    "pagination current page equals 2",
    searchResultPage2.pagination.current === 2,
  );

  // 6. Filter by custom_domain
  const domainToFilter =
    tenantSettingsList[1].custom_domain ?? "nonexistent.com";
  const domainFilterBody = {
    page: 1,
    limit: 10,
    custom_domain: domainToFilter,
    branding_color_primary: undefined,
    branding_color_secondary: undefined,
    created_from: null,
    created_to: null,
    order_by: undefined,
    order_dir: undefined,
  } satisfies IEnterpriseLmsTenantSettings.IRequest;

  const domainFilterResult: IPageIEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.index(
      connection,
      {
        tenantId: tenant.id,
        body: domainFilterBody,
      },
    );
  typia.assert(domainFilterResult);

  // All results should have the filtered custom_domain
  for (const setting of domainFilterResult.data) {
    TestValidator.equals(
      "setting custom_domain matches filter",
      setting.custom_domain,
      domainToFilter,
    );
  }

  // 7. Filter with creation date range
  // Use creation dates between earliest and latest tenantSettings created_at
  const createdDates = tenantSettingsList
    .map((s) => s.created_at)
    .filter((v): v is string => v !== null && v !== undefined);
  const createdFrom = createdDates.reduce((a, b) => (a < b ? a : b));
  const createdTo = createdDates.reduce((a, b) => (a > b ? a : b));

  const dateRangeFilterBody = {
    page: 1,
    limit: 10,
    created_from: createdFrom,
    created_to: createdTo,
    branding_color_primary: undefined,
    branding_color_secondary: undefined,
    custom_domain: undefined,
    order_by: undefined,
    order_dir: undefined,
  } satisfies IEnterpriseLmsTenantSettings.IRequest;

  const dateFilterResult: IPageIEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.index(
      connection,
      {
        tenantId: tenant.id,
        body: dateRangeFilterBody,
      },
    );
  typia.assert(dateFilterResult);

  // All results should have created_at within date range
  for (const setting of dateFilterResult.data) {
    TestValidator.predicate(
      `created_at of ${setting.id} within range`,
      setting.created_at >= createdFrom && setting.created_at <= createdTo,
    );
  }

  // 8. Validate error on invalid filter parameters
  await TestValidator.error("invalid order_dir value should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.index(
      connection,
      {
        tenantId: tenant.id,
        body: {
          ...searchRequestPage1,
          order_dir: "invalid_direction" as unknown as "asc" | "desc" | null,
        },
      },
    );
  });

  await TestValidator.error("invalid page number should fail", async () => {
    const invalidPageBody = {
      ...searchRequestPage1,
      page: -1,
    } satisfies IEnterpriseLmsTenantSettings.IRequest;

    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.index(
      connection,
      {
        tenantId: tenant.id,
        body: invalidPageBody,
      },
    );
  });
}
