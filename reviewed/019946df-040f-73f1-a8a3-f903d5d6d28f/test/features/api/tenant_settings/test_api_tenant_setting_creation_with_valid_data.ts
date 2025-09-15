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
 * End-to-end test for tenant settings creation with valid data.
 *
 * This test validates the multi-role authentication and authorization
 * workflow where a system administrator creates a new tenant organization,
 * and an organization administrator creates tenant-specific settings
 * including branding and domain information. The test ensures proper role
 * switching, tenant boundary enforcement, and successful creation of tenant
 * settings with all required and optional fields.
 *
 * Steps:
 *
 * 1. System administrator joins (registers).
 * 2. System administrator logs in for authentication context.
 * 3. System administrator creates a tenant organization with unique code and
 *    name.
 * 4. Organization administrator joins with tenancy assigned.
 * 5. Organization administrator logs in to simulate real-world role switch.
 * 6. Organization administrator creates tenant settings with comprehensive
 *    valid data.
 * 7. Validate that tenant settings response matches the input provided,
 *    including nullables and optional fields.
 */
export async function test_api_tenant_setting_creation_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: System administrator joins
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = "StrongPassw0rd!";
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        status: "active",
      },
    });
  typia.assert(systemAdmin);

  // Step 2: System administrator logs in
  const loggedInSystemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
      },
    });
  typia.assert(loggedInSystemAdmin);

  // Step 3: System administrator creates tenant
  const tenantCode = `tenant-${RandomGenerator.alphaNumeric(6)}`;
  const tenantName = RandomGenerator.name();
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: tenantCode,
        name: tenantName,
      },
    });
  typia.assert(tenant);

  // Step 4: Organization administrator joins
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "StrongPassw0rd!";
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: orgAdminEmail,
        password: orgAdminPassword,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
      },
    });
  typia.assert(organizationAdmin);

  // Step 5: Organization administrator logs in
  const loggedInOrgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      },
    });
  typia.assert(loggedInOrgAdmin);

  // Step 6: Organization administrator creates tenant settings
  const settingsRequestBody = {
    enterprise_lms_tenant_id: tenant.id,
    branding_logo_uri: "https://cdn.example.com/logo.png",
    branding_color_primary: "#0055ff",
    branding_color_secondary: "#ff5500",
    custom_domain: `customdomain-${RandomGenerator.alphaNumeric(4)}.com`,
    css_overrides: "body { background-color: #fafafa; }",
  } satisfies IEnterpriseLmsTenantSettings.ICreate;

  const tenantSettings: IEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.create(
      connection,
      {
        tenantId: tenant.id,
        body: settingsRequestBody,
      },
    );
  typia.assert(tenantSettings);

  // Step 7: Validate the tenant settings response
  TestValidator.equals(
    "tenant settings tenant id matches",
    tenantSettings.enterprise_lms_tenant_id,
    tenant.id,
  );
  TestValidator.equals(
    "tenant settings branding logo matches",
    tenantSettings.branding_logo_uri,
    settingsRequestBody.branding_logo_uri,
  );
  TestValidator.equals(
    "tenant settings primary color matches",
    tenantSettings.branding_color_primary,
    settingsRequestBody.branding_color_primary,
  );
  TestValidator.equals(
    "tenant settings secondary color matches",
    tenantSettings.branding_color_secondary,
    settingsRequestBody.branding_color_secondary,
  );
  TestValidator.equals(
    "tenant settings custom domain matches",
    tenantSettings.custom_domain,
    settingsRequestBody.custom_domain,
  );
  TestValidator.equals(
    "tenant settings css overrides match",
    tenantSettings.css_overrides,
    settingsRequestBody.css_overrides,
  );
}
