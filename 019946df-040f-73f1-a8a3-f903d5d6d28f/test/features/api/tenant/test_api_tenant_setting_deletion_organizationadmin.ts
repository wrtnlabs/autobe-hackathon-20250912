import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import type { IEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenantSettings";

export async function test_api_tenant_setting_deletion_organizationadmin(
  connection: api.IConnection,
) {
  // 1. SystemAdmin user sign-up
  const systemAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: "passwordHash123!", // Simulated password hash
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // 2. SystemAdmin creates a tenant
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 3. Create and authenticate organizationAdmin user with tenant context
  const orgAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: orgAdminEmail,
        password: "StrongPass123!", // Plaintext password for join
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdmin);

  // 4. OrganizationAdmin creates a tenant setting for their tenant
  const tenantSettingCreateBody = {
    enterprise_lms_tenant_id: tenant.id,
    branding_logo_uri: `https://logo.example.com/${tenant.code}`,
    branding_color_primary: "#123456",
    branding_color_secondary: "#654321",
    custom_domain: `tenant-${tenant.code}.enterprise.example.com`,
    css_overrides: "body { background-color: #fafafa; }",
  } satisfies IEnterpriseLmsTenantSettings.ICreate;

  const tenantSetting: IEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.create(
      connection,
      {
        tenantId: tenant.id,
        body: tenantSettingCreateBody,
      },
    );
  typia.assert(tenantSetting);

  // 5. OrganizationAdmin deletes the tenant setting
  await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.erase(
    connection,
    {
      tenantId: tenant.id,
      id: tenantSetting.id,
    },
  );
}
