import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate update of organization configuration by org admin with
 * supporting authorization and dependencies.
 *
 * This test verifies that an organization admin can update their own
 * organization's configuration according to business constraints and access
 * permissions. It also tests failure scenarios for cross-org manipulation
 * and soft-deleted records.
 *
 * Steps:
 *
 * 1. Register a system admin (for org creation).
 * 2. Register and authenticate an organization admin.
 * 3. As system admin, create an organization (obtain org ID).
 * 4. Switch/authenticate as organization admin.
 * 5. Create a configuration entry linked to the test organization.
 * 6. Update the configuration as org admin (positive test):
 *
 *    - Change key/value/description; do not modify deleted_at.
 *    - Check that result fields are updated as expected.
 *    - Confirm audit fields (updated_at) change; created_at remains.
 * 7. Negative: Update configuration of another organization as this admin
 *    (should fail).
 * 8. Negative: Update configuration that has been soft-deleted.
 * 9. Negative: Update as a system admin against an org-admin-owned
 *    configuration (should fail).
 *
 * Throughout:
 *
 * - Use the correct request/response DTOs; ensure authentication switching
 *   for org-admin vs system-admin flows.
 * - Each negative test checks that forbidden actions throw runtime errors
 *   (never type errors).
 * - Strictly type all random/test data, and assert all API results.
 */
export async function test_api_configuration_update_by_orgadmin_with_full_auth_dependency_chain(
  connection: api.IConnection,
) {
  // 1. Register a system admin for org creation
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysadminEmail,
      password: "SysAdm1n#Test",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysadminJoin);

  // 2. Register/org admin join (but don't authenticate yet)
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "Or9Adm1n!#Test",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);

  // 3. System admin: create a test organization
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: "SysAdm1n#Test",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const orgCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgCreateBody },
    );
  typia.assert(org);

  // 4. Org admin: login (simulate org assignment by setting org id in config create)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "Or9Adm1n!#Test",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 5. Org admin: create organization configuration (with own org id)
  const initialConfigCreate = {
    healthcare_platform_organization_id: org.id,
    key: `test-feature-flag-${RandomGenerator.alphaNumeric(4)}`,
    value: "enabled",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IHealthcarePlatformConfiguration.ICreate;
  const initialConfig =
    await api.functional.healthcarePlatform.organizationAdmin.configuration.create(
      connection,
      { body: initialConfigCreate },
    );
  typia.assert(initialConfig);

  // 6. Org admin: update configuration (positive test)
  const configUpdateBody = {
    key: initialConfigCreate.key + "-v2",
    value: "disabled",
    description: RandomGenerator.paragraph({ sentences: 7 }),
    // Do not set deleted_at
  } satisfies IHealthcarePlatformConfiguration.IUpdate;
  const updatedConfig =
    await api.functional.healthcarePlatform.organizationAdmin.configuration.update(
      connection,
      {
        configurationId: initialConfig.id,
        body: configUpdateBody,
      },
    );
  typia.assert(updatedConfig);
  TestValidator.equals(
    "Updated key field should match",
    updatedConfig.key,
    configUpdateBody.key,
  );
  TestValidator.equals(
    "Updated value field should match",
    updatedConfig.value,
    configUpdateBody.value,
  );
  TestValidator.equals(
    "Updated description should match",
    updatedConfig.description,
    configUpdateBody.description,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedConfig.updated_at,
    initialConfig.updated_at,
  );
  TestValidator.equals(
    "created_at should remain the same",
    updatedConfig.created_at,
    initialConfig.created_at,
  );

  // 7. Negative: Try to update configuration from another org (should fail)
  // 7a. As system admin, create another organization and config for that org
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: "SysAdm1n#Test",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const otherOrg =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(otherOrg);
  // Login as org admin again
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "Or9Adm1n!#Test",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const otherConfig =
    await api.functional.healthcarePlatform.organizationAdmin.configuration.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: otherOrg.id,
          key: `feature-x-${RandomGenerator.alphaNumeric(4)}`,
          value: "1",
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies IHealthcarePlatformConfiguration.ICreate,
      },
    );
  typia.assert(otherConfig);

  // Attempt to update another org's config as original org admin (should fail)
  await TestValidator.error(
    "Org admin cannot update config of other org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.configuration.update(
        connection,
        {
          configurationId: otherConfig.id,
          body: {
            key: "attempt-update-x",
            value: "should-fail",
          } satisfies IHealthcarePlatformConfiguration.IUpdate,
        },
      );
    },
  );

  // 8. Negative: Try to update a soft-deleted config as org admin
  // First, soft-delete the config (we have to update our config and set deleted_at)
  const deletedAt = new Date().toISOString();
  const softDeleted =
    await api.functional.healthcarePlatform.organizationAdmin.configuration.update(
      connection,
      {
        configurationId: initialConfig.id,
        body: {
          deleted_at: deletedAt,
        } satisfies IHealthcarePlatformConfiguration.IUpdate,
      },
    );
  typia.assert(softDeleted);
  TestValidator.equals(
    "deleted_at must be set after soft delete",
    softDeleted.deleted_at,
    deletedAt,
  );

  // Attempt to update the now soft-deleted config (should fail)
  await TestValidator.error("Cannot update soft-deleted config", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.configuration.update(
      connection,
      {
        configurationId: initialConfig.id,
        body: {
          value: "should not work",
          description: "Trying to change after deletion",
        } satisfies IHealthcarePlatformConfiguration.IUpdate,
      },
    );
  });

  // 9. Negative: Try update as system admin against org-admin-owned config
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: "SysAdm1n#Test",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  await TestValidator.error(
    "System admin cannot update org-admin config as org admin",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.configuration.update(
        connection,
        {
          configurationId: initialConfig.id,
          body: {
            value: "fail-by-sysadmin",
          } satisfies IHealthcarePlatformConfiguration.IUpdate,
        },
      );
    },
  );
}
