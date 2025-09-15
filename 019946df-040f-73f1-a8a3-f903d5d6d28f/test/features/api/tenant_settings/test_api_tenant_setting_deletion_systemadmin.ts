import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import type { IEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenantSettings";

/**
 * End-to-end test validating the deletion of a tenant setting by a system
 * administrator.
 *
 * This test simulates the complete lifecycle including authentication as
 * systemAdmin and organizationAdmin, tenant creation, tenant setting creation,
 * deletion, and verification of deletion.
 *
 * Steps:
 *
 * 1. Create systemAdmin user and authenticate.
 * 2. Create a tenant organization.
 * 3. Create an organizationAdmin user for the tenant.
 * 4. Authenticate as organizationAdmin and create a tenant setting.
 * 5. Switch back to systemAdmin and delete the tenant setting.
 * 6. Attempt to delete the same tenant setting again, expecting failure.
 *
 * Validates type safety, business logic enforcement, and multi-tenant data
 * isolation.
 */
export async function test_api_tenant_setting_deletion_systemadmin(
  connection: api.IConnection,
) {
  // 1. Create systemAdmin user and authenticate
  const systemAdminUser: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: `sysadmin.${RandomGenerator.alphaNumeric(6)}@example.com`,
        password_hash: "Password123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdminUser);

  // 2. Create a tenant organization
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: `tenant${RandomGenerator.alphaNumeric(4)}`,
        name: `Tenant ${RandomGenerator.name(2)}`,
      } satisfies IEnterpriseLmsTenant.ICreate,
    });
  typia.assert(tenant);

  // 3. Create an organizationAdmin user for the tenant
  const orgAdminUser: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: `orgadmin.${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "Password123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdminUser);

  // 4. Authenticate as organizationAdmin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminUser.email,
      password: "Password123!",
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 5. Create a tenant setting associated with the tenant
  const tenantSettingCreateBody = {
    enterprise_lms_tenant_id: tenant.id,
    branding_logo_uri: `https://example.com/logo-${RandomGenerator.alphaNumeric(5)}.png`,
    branding_color_primary: `#${RandomGenerator.alphaNumeric(6)}`,
    branding_color_secondary: `#${RandomGenerator.alphaNumeric(6)}`,
    custom_domain: `tenant${RandomGenerator.alphaNumeric(4)}.example.com`,
    css_overrides: `.custom-style-${RandomGenerator.alphaNumeric(4)} { color: #${RandomGenerator.alphaNumeric(6)}; }`,
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

  // 6. Switch back to systemAdmin user context
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminUser.email,
      password_hash: "Password123!",
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 7. Delete the created tenant setting
  await api.functional.enterpriseLms.systemAdmin.tenants.tenantSettings.erase(
    connection,
    {
      tenantId: tenant.id,
      id: tenantSetting.id,
    },
  );

  // 8. Attempt to delete the same tenant setting again, expecting failure
  await TestValidator.error(
    "Deleting an already deleted tenant setting should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.tenants.tenantSettings.erase(
        connection,
        {
          tenantId: tenant.id,
          id: tenantSetting.id,
        },
      );
    },
  );
}
