import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test that a system admin can update configuration details for a given
 * configuration entry.
 *
 * Full scenario:
 *
 * 1. Register/join as system admin and authenticate.
 * 2. Create a healthcare organization for use as a configuration scope.
 * 3. Create a configuration associated with that organization.
 * 4. Update the configuration (key, value, description).
 * 5. Assert that updatable fields are modified, timestamps updated.
 * 6. Assert uniqueness/validation constraints, e.g., duplicate key in org is
 *    rejected.
 * 7. Assert audit fields (updated_at changes, created_at remains the same), and
 *    soft-delete behavior.
 * 8. Attempt to update nonexistent configurationId: expect failure.
 * 9. (Negative) Attempt update with insufficient privileges (no system admin):
 *    expect error.
 */
export async function test_api_configuration_update_by_systemadmin_with_dependency_flow(
  connection: api.IConnection,
) {
  // 1. Register/join as system admin
  const adminEmail = `${RandomGenerator.alphabets(8)}@autobe-test.com`;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(systemAdmin);

  // 2. Create an organization for the test
  const orgCode = `ORG-${RandomGenerator.alphaNumeric(6)}`;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.name(2),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);

  // 3. Create a configuration associated with that organization
  const configKey = `feature-flag-${RandomGenerator.alphaNumeric(6)}`;
  const configValue = JSON.stringify({ enabled: true });
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const configuration =
    await api.functional.healthcarePlatform.systemAdmin.configuration.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          key: configKey,
          value: configValue,
          description,
        } satisfies IHealthcarePlatformConfiguration.ICreate,
      },
    );
  typia.assert(configuration);
  TestValidator.equals(
    "Configured organization ID",
    configuration.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.equals("config key", configuration.key, configKey);
  TestValidator.equals("config value", configuration.value, configValue);
  TestValidator.equals("description", configuration.description, description);

  // 4. Update the configuration (new value/desc/key)
  const updateKey = `${configKey}-updated`;
  const updateValue = JSON.stringify({ enabled: false, threshold: 75 });
  const updateDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.configuration.update(
      connection,
      {
        configurationId: configuration.id,
        body: {
          key: updateKey,
          value: updateValue,
          description: updateDescription,
        } satisfies IHealthcarePlatformConfiguration.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("update key", updated.key, updateKey);
  TestValidator.equals("update value", updated.value, updateValue);
  TestValidator.equals(
    "update description",
    updated.description,
    updateDescription,
  );
  TestValidator.notEquals(
    "updated_at changed after update",
    updated.updated_at,
    configuration.updated_at,
  );
  TestValidator.equals(
    "created_at remains the same",
    updated.created_at,
    configuration.created_at,
  );

  // 5. Uniqueness/validation: attempt duplicate key for org (should fail)
  let duplicateErrorCaught = false;
  try {
    await api.functional.healthcarePlatform.systemAdmin.configuration.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          key: updateKey,
          value: RandomGenerator.paragraph(),
          description: "should fail - duplicate key",
        } satisfies IHealthcarePlatformConfiguration.ICreate,
      },
    );
  } catch (err) {
    duplicateErrorCaught = true;
  }
  TestValidator.predicate(
    "Creating duplicate config key for same org fails",
    duplicateErrorCaught,
  );

  // 6. Update non-existent configId: expect error
  await TestValidator.error(
    "Updating a non-existent configurationId fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.configuration.update(
        connection,
        {
          configurationId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            key: "ghost-key",
          } satisfies IHealthcarePlatformConfiguration.IUpdate,
        },
      );
    },
  );

  // 7. Update as unprivileged (simulate with unauthenticated connection)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Update fails for unauthenticated/non-systemadmin user",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.configuration.update(
        unauthConnection,
        {
          configurationId: configuration.id,
          body: {
            value: "should-fail-unauthed",
          } satisfies IHealthcarePlatformConfiguration.IUpdate,
        },
      );
    },
  );

  // 8. Soft-delete: mark as deleted
  const deleteTimestamp = new Date().toISOString();
  const softDeleted =
    await api.functional.healthcarePlatform.systemAdmin.configuration.update(
      connection,
      {
        configurationId: configuration.id,
        body: {
          deleted_at: deleteTimestamp,
        } satisfies IHealthcarePlatformConfiguration.IUpdate,
      },
    );
  typia.assert(softDeleted);
  TestValidator.equals(
    "configuration soft deleted",
    softDeleted.deleted_at,
    deleteTimestamp,
  );
}
