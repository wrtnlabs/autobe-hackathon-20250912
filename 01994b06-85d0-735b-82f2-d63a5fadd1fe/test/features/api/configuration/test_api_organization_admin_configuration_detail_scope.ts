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
 * Validate proper scoping, authentication, and isolation logic for organization
 * admin configuration detail view.
 *
 * 1. Register system admin (for org creation authority)
 * 2. Register first org admin, then create org as system admin.
 * 3. Login as org admin, create configuration for org, retrieve configuration
 *    detail as that admin (SUCCESS PATH)
 * 4. Attempt to access without authentication (should fail).
 * 5. Register and login as second org admin for another org, attempt to fetch
 *    first org's config (fail: org boundary).
 * 6. Try with random UUID (non-existent config) as org admin (should fail not
 *    found).
 * 7. Simulate soft-deleted by deleting config (if possible API, otherwise skip),
 *    then retrieval (should fail/not found - skip if API not present).
 * 8. Validate output details returned on success (match IDs, values exactly)
 */
export async function test_api_organization_admin_configuration_detail_scope(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(10);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  // 2. Register org admin A and org admin B
  const orgAdminAEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminAPassword = RandomGenerator.alphaNumeric(10);
  const orgAdminA = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminAEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminAPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminA);

  const orgAdminBEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminBPassword = RandomGenerator.alphaNumeric(10);
  const orgAdminB = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminBEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminBPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminB);

  // 3. Create organization A and B with system admin priv
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const orgACode = RandomGenerator.alphaNumeric(8);
  const orgA =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgACode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(orgA);

  const orgBCode = RandomGenerator.alphaNumeric(8);
  const orgB =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgBCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(orgB);

  // 4. Login as org admin A (who belongs to orgA) and create configuration
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminAEmail,
      password: orgAdminAPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const configKey = RandomGenerator.alphaNumeric(12);
  const configCreateReq = {
    healthcare_platform_organization_id: orgA.id,
    key: configKey,
    value: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformConfiguration.ICreate;
  const config =
    await api.functional.healthcarePlatform.organizationAdmin.configuration.create(
      connection,
      {
        body: configCreateReq,
      },
    );
  typia.assert(config);
  TestValidator.equals(
    "healthcare_platform_organization_id matches (orgA)",
    config.healthcare_platform_organization_id,
    orgA.id,
  );
  TestValidator.equals("key matches", config.key, configKey);
  TestValidator.equals("value matches", config.value, configCreateReq.value);
  TestValidator.equals(
    "description matches",
    config.description,
    configCreateReq.description,
  );

  // 5. Successfully retrieve configuration by id as authorized org admin A
  const configDetail =
    await api.functional.healthcarePlatform.organizationAdmin.configuration.at(
      connection,
      {
        configurationId: config.id,
      },
    );
  typia.assert(configDetail);
  TestValidator.equals("config id matches", configDetail.id, config.id);
  TestValidator.equals("config key matches", configDetail.key, config.key);
  TestValidator.equals(
    "config value matches",
    configDetail.value,
    config.value,
  );
  TestValidator.equals(
    "config organization id matches",
    configDetail.healthcare_platform_organization_id,
    orgA.id,
  );

  // 6. Attempt to retrieve config without authentication (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access detail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.configuration.at(
        unauthConn,
        {
          configurationId: config.id,
        },
      );
    },
  );

  // 7. Login as org admin B (belongs to orgB), try to access orgA's configuration (must error)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminBEmail,
      password: orgAdminBPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "org admin from another org denied orgA's config",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.configuration.at(
        connection,
        {
          configurationId: config.id,
        },
      );
    },
  );

  // 8. Try a random (non-existent) configurationId as authorized org admin B
  await TestValidator.error(
    "non-existent configurationId not found",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.configuration.at(
        connection,
        {
          configurationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
