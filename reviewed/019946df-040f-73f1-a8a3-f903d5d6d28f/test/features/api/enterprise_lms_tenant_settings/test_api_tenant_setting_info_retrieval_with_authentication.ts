import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenantSettings";

/**
 * E2E test for retrieval of tenant settings with proper authentication and
 * authorization checks.
 *
 * This test performs the full lifecycle of organizationAdmin user and
 * tenant setting interaction:
 *
 * - Registers and authenticates an organizationAdmin user.
 * - Creates tenant branding & customization settings.
 * - Retrieves and validates tenant setting details.
 * - Validates access control by unauthorized attempts.
 *
 * Test Steps:
 *
 * 1. Call organizationAdmin join API with generated create data.
 * 2. Using received tenantId and token, create tenant setting with randomized
 *    valid data.
 * 3. Retrieve tenant setting by the created id, assert exact matching.
 * 4. Test retrieval with unauthenticated connection expecting failure.
 * 5. Register another orgAdmin with a different tenantId, then try accessing
 *    first tenant's setting expecting failure.
 *
 * This test validates JWT enforcement, path param correctness, and business
 * rules ensuring tenant settings only accessible by proper authorized
 * users.
 */
export async function test_api_tenant_setting_info_retrieval_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register organizationAdmin user
  const orgAdminCreate = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: RandomGenerator.name(1) + "@example.com",
    password: "password123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorizedAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminCreate,
    },
  );
  typia.assert(authorizedAdmin);

  // 2. Create tenant setting for the authenticated tenant
  const tenantSettingCreateData = {
    enterprise_lms_tenant_id: authorizedAdmin.tenant_id,
    branding_logo_uri: `https://example.com/logo-${RandomGenerator.alphaNumeric(6)}.png`,
    branding_color_primary: `#${RandomGenerator.alphaNumeric(6)}`,
    branding_color_secondary: `#${RandomGenerator.alphaNumeric(6)}`,
    custom_domain: `tenant${RandomGenerator.alphaNumeric(6)}.example.com`,
    css_overrides: `.custom-style-${RandomGenerator.alphaNumeric(4)} { color: #${RandomGenerator.alphaNumeric(6)}; }`,
  } satisfies IEnterpriseLmsTenantSettings.ICreate;

  const createdTenantSetting =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.create(
      connection,
      {
        tenantId: authorizedAdmin.tenant_id,
        body: tenantSettingCreateData,
      },
    );
  typia.assert(createdTenantSetting);

  // 3. Retrieve the tenant setting and assert deep equality
  const retrievedTenantSetting =
    await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.at(
      connection,
      {
        tenantId: authorizedAdmin.tenant_id,
        id: createdTenantSetting.id,
      },
    );
  typia.assert(retrievedTenantSetting);

  TestValidator.equals(
    "retrieved tenant setting matches created",
    retrievedTenantSetting,
    createdTenantSetting,
  );

  // 4. Test unauthorized access (without authorization header)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access without token should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.at(
        unauthenticatedConn,
        {
          tenantId: authorizedAdmin.tenant_id,
          id: createdTenantSetting.id,
        },
      );
    },
  );

  // 5. Register another organizationAdmin with different tenant and test access
  const otherOrgAdminCreate = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: RandomGenerator.name(1) + "@example.net",
    password: "password123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const otherAuthorizedAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: otherOrgAdminCreate,
    },
  );
  typia.assert(otherAuthorizedAdmin);

  await TestValidator.error(
    "access tenant setting of another tenant should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.tenants.tenantSettings.at(
        connection,
        {
          tenantId: otherAuthorizedAdmin.tenant_id,
          id: createdTenantSetting.id,
        },
      );
    },
  );
}
