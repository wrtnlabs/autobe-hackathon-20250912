import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenantSettings";

export async function test_api_tenant_setting_creation_and_update_flow(
  connection: api.IConnection,
) {
  // 1. organizationAdmin user join and authenticate
  const adminCreateEmail = typia.random<string & tags.Format<"email">>();
  const adminCreate: IEnterpriseLmsOrganizationAdmin.ICreate = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: adminCreateEmail,
    password: "password1234",
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(1),
  };

  let organizationAdminAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreate,
    });
  typia.assert(organizationAdminAuthorized);

  // 2. Another organizationAdmin user join for access control test
  const otherAdminEmail = typia.random<string & tags.Format<"email">>();
  const otherAdminCreate: IEnterpriseLmsOrganizationAdmin.ICreate = {
    tenant_id: adminCreate.tenant_id,
    email: otherAdminEmail,
    password: "password1234",
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(1),
  };
  let otherOrganizationAdminAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: otherAdminCreate,
    });
  typia.assert(otherOrganizationAdminAuthorized);

  // Log in second org admin to simulate role switch and test unauthorized action
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: otherAdminCreate.email,
      password: "password1234",
    },
  });

  // 3. Create tenant setting with first org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminCreate.email,
      password: "password1234",
    },
  });

  const tenantSettingCreateBody: IEnterpriseLmsTenantSettings.ICreate = {
    enterprise_lms_tenant_id: adminCreate.tenant_id,
    branding_logo_uri: `https://example.com/logo/${RandomGenerator.alphaNumeric(8)}.png`,
    branding_color_primary: `#${RandomGenerator.alphaNumeric(6)}`,
    branding_color_secondary: `#${RandomGenerator.alphaNumeric(6)}`,
    custom_domain: `tenant${RandomGenerator.alphaNumeric(5)}.example.com`,
    css_overrides: `.tenant-${RandomGenerator.alphaNumeric(5)} { color: #${RandomGenerator.alphaNumeric(6)}; }`,
  };

  const createdTenantSetting =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.create(
      connection,
      {
        tenantId: adminCreate.tenant_id,
        body: tenantSettingCreateBody,
      },
    );
  typia.assert(createdTenantSetting);

  TestValidator.equals(
    "tenant setting tenant ID matches",
    createdTenantSetting.enterprise_lms_tenant_id,
    tenantSettingCreateBody.enterprise_lms_tenant_id,
  );
  TestValidator.equals(
    "tenant setting branding logo uri matches",
    createdTenantSetting.branding_logo_uri,
    tenantSettingCreateBody.branding_logo_uri,
  );
  TestValidator.equals(
    "tenant setting primary color matches",
    createdTenantSetting.branding_color_primary,
    tenantSettingCreateBody.branding_color_primary,
  );
  TestValidator.equals(
    "tenant setting secondary color matches",
    createdTenantSetting.branding_color_secondary,
    tenantSettingCreateBody.branding_color_secondary,
  );
  TestValidator.equals(
    "tenant setting custom domain matches",
    createdTenantSetting.custom_domain,
    tenantSettingCreateBody.custom_domain,
  );
  TestValidator.equals(
    "tenant setting css overrides matches",
    createdTenantSetting.css_overrides,
    tenantSettingCreateBody.css_overrides,
  );

  // 4. systemAdmin user join and authenticate
  const systemAdminCreateEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminCreate: IEnterpriseLmsSystemAdmin.ICreate = {
    email: systemAdminCreateEmail,
    password_hash: "hashedpassword",
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(1),
    status: "active",
  };

  const systemAdminAuthorized = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: systemAdminCreate,
    },
  );
  typia.assert(systemAdminAuthorized);

  // systemAdmin login
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminCreate.email,
      password_hash: "hashedpassword",
    },
  });

  // 5. Update tenant setting via systemAdmin API
  const tenantSettingUpdateBody: IEnterpriseLmsTenantSettings.IUpdate = {
    branding_logo_uri: `https://modified.example.com/logo/${RandomGenerator.alphaNumeric(8)}.png`,
    branding_color_primary: `#${RandomGenerator.alphaNumeric(6)}`,
    branding_color_secondary: `#${RandomGenerator.alphaNumeric(6)}`,
    custom_domain: `modified-tenant${RandomGenerator.alphaNumeric(5)}.example.com`,
    css_overrides: `.tenant-modified-${RandomGenerator.alphaNumeric(5)} { background-color: #${RandomGenerator.alphaNumeric(6)}; }`,
  };

  const updatedTenantSetting =
    await api.functional.enterpriseLms.systemAdmin.tenants.tenantSettings.update(
      connection,
      {
        tenantId: adminCreate.tenant_id,
        id: createdTenantSetting.id,
        body: tenantSettingUpdateBody,
      },
    );
  typia.assert(updatedTenantSetting);

  TestValidator.equals(
    "updated tenant setting id matches",
    updatedTenantSetting.id,
    createdTenantSetting.id,
  );
  TestValidator.equals(
    "updated tenant setting primary color matches",
    updatedTenantSetting.branding_color_primary,
    tenantSettingUpdateBody.branding_color_primary,
  );
  TestValidator.equals(
    "updated tenant setting secondary color matches",
    updatedTenantSetting.branding_color_secondary,
    tenantSettingUpdateBody.branding_color_secondary,
  );
  TestValidator.equals(
    "updated tenant setting branding logo uri matches",
    updatedTenantSetting.branding_logo_uri,
    tenantSettingUpdateBody.branding_logo_uri,
  );
  TestValidator.equals(
    "updated tenant setting custom domain matches",
    updatedTenantSetting.custom_domain,
    tenantSettingUpdateBody.custom_domain,
  );
  TestValidator.equals(
    "updated tenant setting css overrides matches",
    updatedTenantSetting.css_overrides,
    tenantSettingUpdateBody.css_overrides,
  );

  // 6. Retrieve tenant setting via organizationAdmin and verify updated data
  const tenantSettingRetrieved =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.at(
      connection,
      {
        tenantId: adminCreate.tenant_id,
        id: createdTenantSetting.id,
      },
    );
  typia.assert(tenantSettingRetrieved);

  TestValidator.equals(
    "retrieved tenant setting id matches",
    tenantSettingRetrieved.id,
    createdTenantSetting.id,
  );
  TestValidator.equals(
    "retrieved tenant setting primary color matches",
    tenantSettingRetrieved.branding_color_primary,
    tenantSettingUpdateBody.branding_color_primary,
  );
  TestValidator.equals(
    "retrieved tenant setting secondary color matches",
    tenantSettingRetrieved.branding_color_secondary,
    tenantSettingUpdateBody.branding_color_secondary,
  );
  TestValidator.equals(
    "retrieved tenant setting branding logo uri matches",
    tenantSettingRetrieved.branding_logo_uri,
    tenantSettingUpdateBody.branding_logo_uri,
  );
  TestValidator.equals(
    "retrieved tenant setting custom domain matches",
    tenantSettingRetrieved.custom_domain,
    tenantSettingUpdateBody.custom_domain,
  );
  TestValidator.equals(
    "retrieved tenant setting css overrides matches",
    tenantSettingRetrieved.css_overrides,
    tenantSettingUpdateBody.css_overrides,
  );

  // 7. Attempt update with unauthorized user (other organizationAdmin)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: otherAdminCreate.email,
      password: "password1234",
    },
  });

  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.tenants.tenantSettings.update(
        connection,
        {
          tenantId: adminCreate.tenant_id,
          id: createdTenantSetting.id,
          body: tenantSettingUpdateBody,
        },
      );
    },
  );
}
