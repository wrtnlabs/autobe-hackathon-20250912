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
 * Validate creation of configuration by organization admin with full
 * dependency/role flows.
 *
 * 1. Register and authenticate as system admin
 * 2. Create a healthcare organization as system admin
 * 3. Register and authenticate as organization admin
 * 4. Create a configuration within the created organization
 * 5. Validate response DTO and correct assignment
 * 6. Attempt to create duplicate configuration key and expect failure
 * 7. Attempt to create configuration without organization context (expect failure)
 * 8. Attempt to create configuration as system admin (expect unauthorized/failure)
 */
export async function test_api_configuration_creation_for_orgadmin_with_all_dependency_flows(
  connection: api.IConnection,
) {
  // 1. System admin join
  const sysAdminEmail =
    RandomGenerator.name(2).replace(" ", ".") + "@company.com";
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "sysAdminPass123",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  // 2. Create organization as system admin
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name(3);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);

  // 3. Register and authenticate as org admin
  const orgAdminEmail =
    RandomGenerator.name(2).replace(" ", ".") + "@company.com";
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(2),
        password: "orgAdminPass456",
        phone: RandomGenerator.mobile(),
        provider: undefined,
        provider_key: undefined,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);

  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: "orgAdminPass456",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminLogin);

  // 4. Organization admin creates configuration
  const configKey = RandomGenerator.alphaNumeric(10);
  const configValue = RandomGenerator.paragraph({ sentences: 1 });
  const configDesc = RandomGenerator.paragraph({ sentences: 5 });
  const createConfigBody = {
    healthcare_platform_organization_id: org.id,
    key: configKey,
    value: configValue,
    description: configDesc,
  } satisfies IHealthcarePlatformConfiguration.ICreate;

  const createdConfig =
    await api.functional.healthcarePlatform.organizationAdmin.configuration.create(
      connection,
      {
        body: createConfigBody,
      },
    );
  typia.assert(createdConfig);

  // 5. Validate correct assignment
  TestValidator.equals(
    "configuration assigned to correct organization",
    createdConfig.healthcare_platform_organization_id,
    org.id,
  );
  TestValidator.equals(
    "configuration key matches",
    createdConfig.key,
    configKey,
  );
  TestValidator.equals(
    "configuration value matches",
    createdConfig.value,
    configValue,
  );
  TestValidator.equals(
    "configuration description matches",
    createdConfig.description,
    configDesc,
  );

  // 6. Attempt to create duplicate configuration key (should fail)
  await TestValidator.error(
    "cannot create duplicate configuration key",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.configuration.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: org.id,
            key: configKey,
            value: RandomGenerator.paragraph(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IHealthcarePlatformConfiguration.ICreate,
        },
      );
    },
  );

  // 7. Attempt to create config with missing organization id (should fail)
  await TestValidator.error(
    "organization_id is required for org-specific configuration",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.configuration.create(
        connection,
        {
          body: {
            key: RandomGenerator.alphaNumeric(10),
            value: RandomGenerator.paragraph(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IHealthcarePlatformConfiguration.ICreate,
        },
      );
    },
  );

  // 8. Switch to system admin and try unauthorized config creation (should fail)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "sysAdminPass123",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  await TestValidator.error(
    "system admin cannot create organization configuration",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.configuration.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: org.id,
            key: RandomGenerator.alphaNumeric(10),
            value: RandomGenerator.paragraph(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IHealthcarePlatformConfiguration.ICreate,
        },
      );
    },
  );
}
