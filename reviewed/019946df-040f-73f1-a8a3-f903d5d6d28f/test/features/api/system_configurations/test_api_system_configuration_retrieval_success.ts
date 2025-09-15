import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemConfiguration";
import type { IEnterpriseLmsSystemConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemConfigurations";

/**
 * Validate the retrieval of a system configuration entity by a systemAdmin
 * user.
 *
 * Business context: Only authenticated systemAdmin users can create and
 * retrieve system configurations that affect global system settings.
 *
 * Test workflow:
 *
 * 1. SystemAdmin user joins and authenticates to obtain JWT.
 * 2. Authenticated SystemAdmin creates a configuration record with a unique
 *    key and value.
 * 3. Retrieve the same system configuration by ID and ensure the returned data
 *    matches the created record.
 * 4. Validate timestamps and optional description handling.
 * 5. Attempt to retrieve a non-existent configuration ID and confirm 404 error
 *    is raised.
 * 6. Attempt to retrieve using an invalid UUID format ID and confirm
 *    validation failure.
 * 7. Attempt retrieval with an unauthenticated connection and confirm
 *    unauthorized access error.
 */
export async function test_api_system_configuration_retrieval_success(
  connection: api.IConnection,
) {
  // 1. SystemAdmin joins and authenticates
  const systemAdminBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(24),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminBody,
    });
  typia.assert(systemAdmin);

  // 2. Create a new system configuration
  const newConfigBody = {
    key: `config_${RandomGenerator.alphaNumeric(8)}`,
    value: RandomGenerator.alphaNumeric(12),
    description: "Test configuration description",
  } satisfies IEnterpriseLmsSystemConfiguration.ICreate;
  const createdConfig: IEnterpriseLmsSystemConfiguration =
    await api.functional.enterpriseLms.systemAdmin.systemConfigurations.create(
      connection,
      {
        body: newConfigBody,
      },
    );
  typia.assert(createdConfig);

  // 3. Retrieve the created system configuration by ID
  const retrievedConfig: IEnterpriseLmsSystemConfigurations =
    await api.functional.enterpriseLms.systemAdmin.systemConfigurations.at(
      connection,
      {
        id: createdConfig.id,
      },
    );
  typia.assert(retrievedConfig);

  // Validate that the retrieved configuration matches the created one
  TestValidator.equals(
    "retrieved key equals created key",
    retrievedConfig.key,
    createdConfig.key,
  );
  TestValidator.equals(
    "retrieved value equals created value",
    retrievedConfig.value,
    createdConfig.value,
  );
  TestValidator.equals(
    "retrieved description equals created description",
    retrievedConfig.description,
    newConfigBody.description,
  );
  TestValidator.equals(
    "retrieved created_at equals created created_at",
    retrievedConfig.created_at,
    createdConfig.created_at,
  );
  TestValidator.equals(
    "retrieved updated_at equals created updated_at",
    retrievedConfig.updated_at,
    createdConfig.updated_at,
  );

  // 4. Test retrieval of a non-existent ID - expect error
  await TestValidator.error("retrieval of non-existent ID throws", async () => {
    await api.functional.enterpriseLms.systemAdmin.systemConfigurations.at(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 5. Test retrieval with invalid UUID format - expect error
  await TestValidator.error(
    "retrieval with invalid UUID format throws",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.systemConfigurations.at(
        connection,
        {
          id: "invalid-uuid-format",
        },
      );
    },
  );

  // 6. Test retrieval without authentication - expect unauthorized error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated retrieval throws", async () => {
    await api.functional.enterpriseLms.systemAdmin.systemConfigurations.at(
      unauthConn,
      {
        id: createdConfig.id,
      },
    );
  });
}
