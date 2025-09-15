import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate organization admin configuration deletion (soft) and error
 * logic.
 *
 * 1. Register a new organization admin.
 * 2. Log in as that admin (refresh JWT, even though join sets it).
 * 3. Create a configuration with random key/value/description as this admin.
 * 4. Delete the configuration via its UUID (soft delete).
 * 5. Attempt to delete again should fail (already soft deleted).
 * 6. Attempt to delete a random/non-existent UUID should fail.
 * 7. Register a second admin, login as them, and attempt to delete the first
 *    admin's configuration (should fail).
 */
export async function test_api_delete_organization_admin_configuration_with_valid_configuration_id(
  connection: api.IConnection,
) {
  // 1. Register new organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: "securePw123!",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Log in as new admin (refresh JWT, even though join sets it)
  const adminAuth = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "securePw123!",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminAuth);

  // 3. Create configuration (Global config: org id undefined)
  const configBody = {
    key: RandomGenerator.alphaNumeric(10),
    value: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHealthcarePlatformConfiguration.ICreate;

  const createdConfig =
    await api.functional.healthcarePlatform.organizationAdmin.configuration.create(
      connection,
      {
        body: configBody,
      },
    );
  typia.assert(createdConfig);

  // 4. Delete configuration with correct configurationId
  await api.functional.healthcarePlatform.organizationAdmin.configuration.erase(
    connection,
    {
      configurationId: createdConfig.id,
    },
  );

  // 5. Negative test: Attempt to delete again should fail
  await TestValidator.error(
    "Second deletion of same configuration should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.configuration.erase(
        connection,
        {
          configurationId: createdConfig.id,
        },
      );
    },
  );

  // 6. Negative test: Attempt deletion with random invalid UUID
  await TestValidator.error(
    "Deleting a non-existent configurationId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.configuration.erase(
        connection,
        {
          configurationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Register a different organization admin and try deleting previous config (should fail)
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: secondAdminEmail,
      full_name: RandomGenerator.name(),
      password: "securePw456!",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: secondAdminEmail,
      password: "securePw456!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "Other admin cannot delete configuration not owned by them",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.configuration.erase(
        connection,
        {
          configurationId: createdConfig.id,
        },
      );
    },
  );
}
