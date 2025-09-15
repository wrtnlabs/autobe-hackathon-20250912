import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a healthcare platform system administrator can access
 * configuration details by configurationId.
 *
 * 1. Register (join) a system admin with unique email and password (provider:
 *    'local'), then login for an authorization token.
 * 2. Create a healthcare organization (unique code + name) so configuration
 *    can be attached to an org.
 * 3. Create a configuration record (org-linked, unique key, value,
 *    description) – capture the resulting id.
 * 4. Retrieve configuration by id as authenticated system admin; verify schema
 *    (typia.assert) and business logic (TestValidator.equals for id, orgid,
 *    key, value, etc).
 * 5. Attempt to retrieve configuration with a random (non-existent)
 *    configurationId – expect error.
 * 6. Attempt to call the endpoint with an unauthenticated connection – expect
 *    error.
 *
 * Data is constructed using typia.random or RandomGenerator utilities where
 * appropriate for realistic values (email for admin, code for org, etc). No
 * additional imports beyond template. No type error tests.
 *
 * Edge cases: 404 for non-existent configurationId, error/forbidden for
 * unauthenticated.
 */
export async function test_api_system_admin_configuration_detail_access(
  connection: api.IConnection,
) {
  // 1. Register (join) a system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const fullName = RandomGenerator.name();
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: fullName,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(systemAdmin);

  // 2. Login using the same credentials - this should renew the auth token
  const loginAdmin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginAdmin);

  // 3. Create a healthcare organization for org-linked configuration
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const organization =
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
  typia.assert(organization);

  // 4. Create a configuration record linked to the org
  const configKey = RandomGenerator.alphaNumeric(12);
  const configValue = RandomGenerator.paragraph({ sentences: 8 });
  const configDescription = RandomGenerator.content({ paragraphs: 2 });
  const configuration =
    await api.functional.healthcarePlatform.systemAdmin.configuration.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          key: configKey,
          value: configValue,
          description: configDescription,
        } satisfies IHealthcarePlatformConfiguration.ICreate,
      },
    );
  typia.assert(configuration);

  // 5. Retrieve the configuration detail as authenticated system admin
  const detail =
    await api.functional.healthcarePlatform.systemAdmin.configuration.at(
      connection,
      {
        configurationId: configuration.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "detail id matches created configuration id",
    detail.id,
    configuration.id,
  );
  TestValidator.equals(
    "detail org id matches organization",
    detail.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.equals("detail key matches", detail.key, configKey);
  TestValidator.equals("detail value matches", detail.value, configValue);
  TestValidator.equals(
    "detail description matches",
    detail.description,
    configDescription,
  );

  // 6. Attempt to retrieve configuration with a non-existent configurationId – expect error (404)
  const badConfigId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent configuration id returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.configuration.at(
        connection,
        {
          configurationId: badConfigId,
        },
      );
    },
  );

  // 7. Attempt to call endpoint with an unauthenticated connection - expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to configuration detail returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.configuration.at(
        unauthConn,
        {
          configurationId: configuration.id,
        },
      );
    },
  );
}
