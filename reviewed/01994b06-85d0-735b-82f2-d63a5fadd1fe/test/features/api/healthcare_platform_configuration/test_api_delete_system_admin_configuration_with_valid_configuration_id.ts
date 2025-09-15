import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test the successful deletion of a system admin configuration.
 *
 * 1. Register a new system admin via join (with valid business email, full
 *    name).
 * 2. Log in as the new system admin to get a valid admin session.
 * 3. Create a new global configuration (no org/scoped id, just a unique key
 *    and value).
 * 4. Delete the configuration with DELETE using the id from creation.
 * 5. Confirm by attempting to delete again (should throw error - cannot delete
 *    nonexistent configuration).
 */
export async function test_api_delete_system_admin_configuration_with_valid_configuration_id(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const joinInput = {
    email:
      RandomGenerator.name(2).replace(/\s/g, "").toLowerCase() +
      "@enterprise-corp.com",
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key:
      RandomGenerator.name(1).toLowerCase() + "@enterprise-corp.com",
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Log in with registered system admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: joinInput.email,
      provider: "local",
      provider_key: joinInput.provider_key,
      password: joinInput.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResult);

  // 3. Create config (global scope)
  const createConfig = {
    key: RandomGenerator.alphaNumeric(12),
    value: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    healthcare_platform_organization_id: null,
  } satisfies IHealthcarePlatformConfiguration.ICreate;
  const config =
    await api.functional.healthcarePlatform.systemAdmin.configuration.create(
      connection,
      {
        body: createConfig,
      },
    );
  typia.assert(config);

  // 4. Delete configuration
  await api.functional.healthcarePlatform.systemAdmin.configuration.erase(
    connection,
    { configurationId: config.id },
  );

  // 5. Attempt delete again (should fail)
  await TestValidator.error(
    "Deleting same configuration again should throw error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.configuration.erase(
        connection,
        { configurationId: config.id },
      );
    },
  );
}
