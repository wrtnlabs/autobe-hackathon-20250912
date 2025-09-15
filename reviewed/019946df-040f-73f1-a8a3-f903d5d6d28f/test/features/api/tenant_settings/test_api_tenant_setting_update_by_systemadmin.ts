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
 * Test update of tenant settings by System Admin including full valid update,
 * partial update, unauthorized access attempts, and update of non-existent
 * tenant settings.
 *
 * This test validates the complete business flow from creating system and
 * organization admins, tenant creation, tenant settings creation, followed by
 * updates from system admin. It ensures role base access control, data
 * isolation, persistence of updates, and appropriate error handling. All API
 * operations are type-safe and validated with typia.assert, and assertions
 * validate correctness including negative cases.
 */
export async function test_api_tenant_setting_update_by_systemadmin(
  connection: api.IConnection,
) {
  // 1. Create systemAdmin and authenticate
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminCreate: IEnterpriseLmsSystemAdmin.ICreate = {
    email: systemAdminEmail,
    password_hash: "1234",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  };
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreate,
    });
  typia.assert(systemAdmin);

  // 2. Create a tenant
  const tenantCreate: IEnterpriseLmsTenant.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
  };
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreate,
    });
  typia.assert(tenant);

  // 3. Create and authenticate organizationAdmin user for the tenant
  const organizationAdminEmail = typia.random<string & tags.Format<"email">>();
  const organizationAdminCreate: IEnterpriseLmsOrganizationAdmin.ICreate = {
    tenant_id: tenant.id,
    email: organizationAdminEmail,
    password: "1234",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
  };
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminCreate,
    });
  typia.assert(organizationAdmin);

  // 4. OrganizationAdmin creates initial tenant settings
  const tenantSettingsCreate: IEnterpriseLmsTenantSettings.ICreate = {
    enterprise_lms_tenant_id: tenant.id,
    branding_logo_uri: "https://example.com/logo.png",
    branding_color_primary: "#112233",
    branding_color_secondary: "#445566",
    custom_domain: "example.com",
    css_overrides: "body { background-color: #fff; }",
  };
  // Switch to organizationAdmin authentication
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: organizationAdminEmail,
      password: "1234",
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  const tenantSettings: IEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.create(
      connection,
      {
        tenantId: tenant.id,
        body: tenantSettingsCreate,
      },
    );
  typia.assert(tenantSettings);

  // 5. Switch back to systemAdmin authentication
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: "1234",
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 6. Update tenant settings fully by systemAdmin
  const tenantSettingsUpdateFull: IEnterpriseLmsTenantSettings.IUpdate = {
    branding_logo_uri: "https://example.com/new-logo.png",
    branding_color_primary: "#aabbcc",
    branding_color_secondary: "#ddeeff",
    custom_domain: "newdomain.com",
    css_overrides: "body { background-color: #000; }",
  };
  const updatedTenantSettingsFull: IEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.systemAdmin.tenants.tenantSettings.update(
      connection,
      {
        tenantId: tenant.id,
        id: tenantSettings.id,
        body: tenantSettingsUpdateFull,
      },
    );
  typia.assert(updatedTenantSettingsFull);

  // Validate that all updated fields are changed correctly
  TestValidator.equals(
    "updated branding_logo_uri matches",
    updatedTenantSettingsFull.branding_logo_uri,
    tenantSettingsUpdateFull.branding_logo_uri,
  );
  TestValidator.equals(
    "updated branding_color_primary matches",
    updatedTenantSettingsFull.branding_color_primary,
    tenantSettingsUpdateFull.branding_color_primary,
  );
  TestValidator.equals(
    "updated branding_color_secondary matches",
    updatedTenantSettingsFull.branding_color_secondary,
    tenantSettingsUpdateFull.branding_color_secondary,
  );
  TestValidator.equals(
    "updated custom_domain matches",
    updatedTenantSettingsFull.custom_domain,
    tenantSettingsUpdateFull.custom_domain,
  );
  TestValidator.equals(
    "updated css_overrides matches",
    updatedTenantSettingsFull.css_overrides,
    tenantSettingsUpdateFull.css_overrides,
  );

  // 7. Attempt unauthorized update as organizationAdmin (should fail)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: organizationAdminEmail,
      password: "1234",
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "organizationAdmin cannot update tenant settings via systemAdmin API",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.tenants.tenantSettings.update(
        connection,
        {
          tenantId: tenant.id,
          id: tenantSettings.id,
          body: {
            custom_domain: "unauthorized-update.com",
          },
        },
      );
    },
  );

  // 8. Attempt update of non-existent tenant settings (should fail)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: "1234",
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  await TestValidator.error(
    "update non-existent tenant settings should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.tenants.tenantSettings.update(
        connection,
        {
          tenantId: tenant.id,
          id: typia.random<string & tags.Format<"uuid">>(),
          body: {
            custom_domain: "nonexistent.com",
          },
        },
      );
    },
  );

  // 9. Partial update test - update only some fields
  const partialUpdate: IEnterpriseLmsTenantSettings.IUpdate = {
    branding_color_primary: "#123456",
    css_overrides: null, // Explicitly clear css_overrides
  };
  const updatedTenantSettingsPartial: IEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.systemAdmin.tenants.tenantSettings.update(
      connection,
      {
        tenantId: tenant.id,
        id: tenantSettings.id,
        body: partialUpdate,
      },
    );
  typia.assert(updatedTenantSettingsPartial);

  TestValidator.equals(
    "partial update branding_color_primary matches",
    updatedTenantSettingsPartial.branding_color_primary,
    partialUpdate.branding_color_primary,
  );
  TestValidator.equals(
    "partial update css_overrides cleared",
    updatedTenantSettingsPartial.css_overrides,
    null,
  );
  // Confirm other fields remain unchanged from previous full update
  TestValidator.equals(
    "partial update branding_logo_uri remains unchanged",
    updatedTenantSettingsPartial.branding_logo_uri,
    updatedTenantSettingsFull.branding_logo_uri,
  );
  TestValidator.equals(
    "partial update branding_color_secondary remains unchanged",
    updatedTenantSettingsPartial.branding_color_secondary,
    updatedTenantSettingsFull.branding_color_secondary,
  );
  TestValidator.equals(
    "partial update custom_domain remains unchanged",
    updatedTenantSettingsPartial.custom_domain,
    updatedTenantSettingsFull.custom_domain,
  );
}
