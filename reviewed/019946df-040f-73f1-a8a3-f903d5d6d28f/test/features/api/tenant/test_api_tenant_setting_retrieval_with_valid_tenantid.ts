import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import type { IEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenantSettings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsTenantSettings";

export async function test_api_tenant_setting_retrieval_with_valid_tenantid(
  connection: api.IConnection,
) {
  // 1. SystemAdmin user joins (register)
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        password_hash: sysAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // 2. Create a copy of connection for systemAdmin
  const sysAdminConnection: api.IConnection = { ...connection };

  // 3. Create a tenant using systemAdmin auth
  const tenantCode = RandomGenerator.alphabets(8);
  const tenantName = RandomGenerator.name(2);

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(
      sysAdminConnection,
      {
        body: {
          code: tenantCode,
          name: tenantName,
        } satisfies IEnterpriseLmsTenant.ICreate,
      },
    );
  typia.assert(tenant);
  TestValidator.predicate(
    "tenant id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      tenant.id,
    ),
  );

  // 4. OrganizationAdmin user joins (register) with created tenant id
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: orgAdminEmail,
        password: orgAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdmin);

  // 5. Create a copy of connection for orgAdmin
  const orgAdminConnection: api.IConnection = { ...connection };

  // 6. organizationAdmin creates tenant settings for the tenant
  const brandingLogoUri = `https://example.com/logo-${RandomGenerator.alphaNumeric(
    8,
  )}.png`;
  const brandingColorPrimary = `#${RandomGenerator.alphaNumeric(6)}`;
  const brandingColorSecondary = `#${RandomGenerator.alphaNumeric(6)}`;
  const customDomain = `tenant-${RandomGenerator.alphabets(5)}.example.com`;
  const cssOverrides = "body { background-color: #f0f0f0; }";

  const tenantSettings: IEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.create(
      orgAdminConnection,
      {
        tenantId: tenant.id,
        body: {
          enterprise_lms_tenant_id: tenant.id,
          branding_logo_uri: brandingLogoUri,
          branding_color_primary: brandingColorPrimary,
          branding_color_secondary: brandingColorSecondary,
          custom_domain: customDomain,
          css_overrides: cssOverrides,
        } satisfies IEnterpriseLmsTenantSettings.ICreate,
      },
    );
  typia.assert(tenantSettings);

  // 7. Retrieve tenant settings by tenantId using PATCH /tenantSettings (search / index API)
  const tenantSettingsPage: IPageIEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.index(
      orgAdminConnection,
      {
        tenantId: tenant.id,
        body: {
          page: 1,
          limit: 10,
          branding_color_primary: brandingColorPrimary,
          branding_color_secondary: brandingColorSecondary,
          custom_domain: customDomain,
        } satisfies IEnterpriseLmsTenantSettings.IRequest,
      },
    );
  typia.assert(tenantSettingsPage);

  TestValidator.predicate(
    "tenant settings page has records",
    tenantSettingsPage.data.length > 0,
  );

  const foundSettings = tenantSettingsPage.data.find(
    (s) =>
      s.id === tenantSettings.id && s.enterprise_lms_tenant_id === tenant.id,
  );
  TestValidator.predicate(
    "tenant settings found in page",
    foundSettings !== undefined,
  );

  // 8. Test failure scenario: Attempt to retrieve tenant settings with invalid tenantId
  await TestValidator.error("should fail with invalid tenant id", async () => {
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.index(
      orgAdminConnection,
      {
        tenantId: "00000000-0000-0000-0000-000000000000",
        body: {
          page: 1,
          limit: 10,
        } satisfies IEnterpriseLmsTenantSettings.IRequest,
      },
    );
  });
}
