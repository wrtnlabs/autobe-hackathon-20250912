import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenantSettings";

/**
 * This E2E test validates tenant settings update operation for an existing
 * tenant organization by an authorized organization administrator user.
 *
 * The test includes full lifecycle: authentication of a new organization admin
 * user, tenant settings creation with null defaults, update of tenant settings
 * with random valid branding/color/domain/css values, and validation of updated
 * data correctness.
 *
 * It also verifies failure cases of unauthorized requests, invalid tenantId,
 * and invalid tenant settings id rejections.
 *
 * All API calls are awaited and their responses validated using typia.assert.
 */
export async function test_api_tenant_settings_update_organization_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new organization admin user and obtain a valid token
  const adminAuth: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email:
          RandomGenerator.name(2).replace(/ /g, "").toLowerCase() +
          "@example.com",
        password: "TestPassword123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Create tenant settings record with null default values
  const tenantId = adminAuth.tenant_id;
  const tenantSettingCreateBody = {
    enterprise_lms_tenant_id: tenantId,
    branding_logo_uri: null,
    branding_color_primary: null,
    branding_color_secondary: null,
    custom_domain: null,
    css_overrides: null,
  } satisfies IEnterpriseLmsTenantSettings.ICreate;

  const createdTenantSetting: IEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.create(
      connection,
      {
        tenantId: tenantId,
        body: tenantSettingCreateBody,
      },
    );
  typia.assert(createdTenantSetting);

  // 3. Update tenant settings with random, valid values for branding, colors, domain, and CSS
  const tenantSettingUpdateBody = {
    branding_logo_uri: `https://cdn.example.com/logo/${RandomGenerator.alphaNumeric(10)}.png`,
    branding_color_primary: `#${[..."0123456789abcdef"].map(() => RandomGenerator.pick([..."0123456789abcdef"])).join("")}`,
    branding_color_secondary: `#${[..."0123456789abcdef"].map(() => RandomGenerator.pick([..."0123456789abcdef"])).join("")}`,
    custom_domain: `${RandomGenerator.alphaNumeric(8)}.example.org`,
    css_overrides: `.custom-style { color: #123456; }`,
  } satisfies IEnterpriseLmsTenantSettings.IUpdate;

  const updatedTenantSetting: IEnterpriseLmsTenantSettings =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.update(
      connection,
      {
        tenantId: tenantId,
        id: createdTenantSetting.id,
        body: tenantSettingUpdateBody,
      },
    );
  typia.assert(updatedTenantSetting);

  // Validate the updated fields match the requested update
  TestValidator.equals(
    "updated branding_logo_uri",
    updatedTenantSetting.branding_logo_uri,
    tenantSettingUpdateBody.branding_logo_uri,
  );
  TestValidator.equals(
    "updated branding_color_primary",
    updatedTenantSetting.branding_color_primary,
    tenantSettingUpdateBody.branding_color_primary,
  );
  TestValidator.equals(
    "updated branding_color_secondary",
    updatedTenantSetting.branding_color_secondary,
    tenantSettingUpdateBody.branding_color_secondary,
  );
  TestValidator.equals(
    "updated custom_domain",
    updatedTenantSetting.custom_domain,
    tenantSettingUpdateBody.custom_domain,
  );
  TestValidator.equals(
    "updated css_overrides",
    updatedTenantSetting.css_overrides,
    tenantSettingUpdateBody.css_overrides,
  );

  // 4. Validate failure case: update rejects on invalid tenantId
  await TestValidator.error("invalid tenantId rejected", async () => {
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.update(
      connection,
      {
        tenantId: typia.random<string & tags.Format<"uuid">>(),
        id: createdTenantSetting.id,
        body: tenantSettingUpdateBody,
      },
    );
  });

  // 5. Validate failure case: update rejects on invalid tenant setting id
  await TestValidator.error("invalid tenantSetting id rejected", async () => {
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.update(
      connection,
      {
        tenantId: tenantId,
        id: typia.random<string & tags.Format<"uuid">>(),
        body: tenantSettingUpdateBody,
      },
    );
  });

  // 6. Validate failure case: unauthorized update rejected using empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized update rejected", async () => {
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.update(
      unauthenticatedConnection,
      {
        tenantId: tenantId,
        id: createdTenantSetting.id,
        body: tenantSettingUpdateBody,
      },
    );
  });
}
