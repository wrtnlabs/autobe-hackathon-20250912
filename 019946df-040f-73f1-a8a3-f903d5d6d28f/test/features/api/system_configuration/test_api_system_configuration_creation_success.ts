import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemConfiguration";

/**
 * Test the creation of a system configuration entry with authorized
 * systemAdmin context.
 *
 * This test covers the following workflow:
 *
 * 1. Creation and authentication of a systemAdmin user.
 * 2. Creation of a system configuration with a unique key, value, and optional
 *    description.
 * 3. Validation of the creation response to ensure it contains the expected
 *    properties.
 * 4. Verification that duplicate key creation is rejected.
 * 5. Verification that unauthorized connection attempts to create
 *    configurations are forbidden.
 *
 * The test ensures role-based access control, data uniqueness enforcement,
 * and proper API behavior.
 *
 * Steps:
 *
 * 1. Create a systemAdmin user and authenticate, receiving the authorization
 *    token.
 * 2. Use the authorized connection to create a system configuration with
 *    random but valid data.
 * 3. Assert that the created configuration has all expected properties and
 *    values matching inputs.
 * 4. Attempt to create another configuration with the same key and expect
 *    failure.
 * 5. Attempt to create a configuration with an unauthorized connection and
 *    expect failure.
 */
export async function test_api_system_configuration_creation_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate systemAdmin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Create an authorized connection copy carrying token implicitly
  // (SDK manages Authorization headers automatically)
  const authorizedConnection: api.IConnection = { ...connection };

  // 2. Create a system configuration with unique key
  const configKey = `key_${RandomGenerator.alphaNumeric(8)}`;
  const configCreateBody = {
    key: configKey,
    value: RandomGenerator.alphaNumeric(20),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEnterpriseLmsSystemConfiguration.ICreate;

  const configCreated: IEnterpriseLmsSystemConfiguration =
    await api.functional.enterpriseLms.systemAdmin.systemConfigurations.create(
      authorizedConnection,
      {
        body: configCreateBody,
      },
    );
  typia.assert(configCreated);

  // 3. Validate creation response
  TestValidator.equals(
    "created config key should match input",
    configCreated.key,
    configCreateBody.key,
  );
  TestValidator.equals(
    "created config value should match input",
    configCreated.value,
    configCreateBody.value,
  );
  TestValidator.equals(
    "created config description should match input",
    configCreated.description ?? null,
    configCreateBody.description ?? null,
  );

  const createdAt = typia.assert<string & tags.Format<"date-time">>(
    configCreated.created_at,
  );
  const updatedAt = typia.assert<string & tags.Format<"date-time">>(
    configCreated.updated_at,
  );
  TestValidator.predicate(
    "created_at is non-empty string",
    typeof createdAt === "string" && createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty string",
    typeof updatedAt === "string" && updatedAt.length > 0,
  );

  // 4. Test duplicate key creation rejected
  await TestValidator.error("duplicate key creation is rejected", async () => {
    await api.functional.enterpriseLms.systemAdmin.systemConfigurations.create(
      authorizedConnection,
      {
        body: {
          key: configKey, // duplicate key
          value: RandomGenerator.alphaNumeric(20),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEnterpriseLmsSystemConfiguration.ICreate,
      },
    );
  });

  // 5. Test unauthorized creation forbidden
  // Create a connection with no Authorization header
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized creation attempt is forbidden",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.systemConfigurations.create(
        unauthorizedConnection,
        {
          body: {
            key: `unauth_${RandomGenerator.alphaNumeric(8)}`,
            value: RandomGenerator.alphaNumeric(20),
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IEnterpriseLmsSystemConfiguration.ICreate,
        },
      );
    },
  );
}
