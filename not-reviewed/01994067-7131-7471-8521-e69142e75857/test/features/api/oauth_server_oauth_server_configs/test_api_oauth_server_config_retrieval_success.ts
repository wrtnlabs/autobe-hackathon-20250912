import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthServerConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerConfigs";

/**
 * This scenario tests the retrieval of an OAuth server configuration by its
 * unique ID with admin authorization. The test includes these steps:
 *
 * 1. Register an admin user with a valid email, email_verified flag, and password.
 * 2. Log in as the admin user to acquire authorization tokens.
 * 3. Create an OAuth server configuration record with a unique key, optional
 *    value, and optional description.
 * 4. Retrieve the created OAuth server configuration by its ID.
 * 5. Validate that the retrieved configuration matches the created one by
 *    comparing the properties, ensuring data integrity.
 * 6. Test error handling for retrieval by using an invalid UUID format id,
 *    expecting a failure.
 * 7. Test retrieval of a non-existent UUID formatted id, expecting a not found
 *    failure.
 * 8. Test unauthorized access by trying to retrieve the configuration without
 *    admin authentication, expecting an authorization error. Throughout,
 *    typia.assert() is used for strong runtime type validation of responses.
 *    TestValidator is used to verify property equality and proper error
 *    throwing. This ensures correctness and robustness of the OAuth server
 *    configuration retrieval API endpoint.
 */
export async function test_api_oauth_server_config_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    email_verified: true,
    password: "P@$$w0rd1234",
  } satisfies IOauthServerAdmin.ICreate;
  const adminUser = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(adminUser);

  // 2. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: "P@$$w0rd1234",
  } satisfies IOauthServerAdmin.ILogin;
  const adminAuth = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminAuth);

  // 3. Create new OAuth server config
  const createConfigBody = {
    key: "test_oauth_server_key" + RandomGenerator.alphaNumeric(8),
    value: "test_value",
    description: "This is a test OAuth server configuration.",
  } satisfies IOauthServerOauthServerConfigs.ICreate;
  const createdConfig =
    await api.functional.oauthServer.admin.oauthServerConfigs.create(
      connection,
      { body: createConfigBody },
    );
  typia.assert(createdConfig);

  // 4. Retrieve by ID
  const retrievedConfig =
    await api.functional.oauthServer.admin.oauthServerConfigs.at(connection, {
      id: createdConfig.id,
    });
  typia.assert(retrievedConfig);

  // 5. Validate retrieved data matches created
  TestValidator.equals(
    "retrieved config id matches",
    retrievedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "retrieved config key matches",
    retrievedConfig.key,
    createConfigBody.key,
  );
  TestValidator.equals(
    "retrieved config value matches",
    retrievedConfig.value ?? null,
    createConfigBody.value ?? null,
  );
  TestValidator.equals(
    "retrieved config description matches",
    retrievedConfig.description ?? null,
    createConfigBody.description ?? null,
  );

  // 6. Error test: invalid UUID format
  await TestValidator.error(
    "retrieval with invalid UUID format id fails",
    async () => {
      await api.functional.oauthServer.admin.oauthServerConfigs.at(connection, {
        id: "invalid-uuid-format" + RandomGenerator.alphaNumeric(4),
      });
    },
  );

  // 7. Error test: non-existent UUID
  let nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  while (nonExistentUUID === createdConfig.id)
    nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval with non-existent UUID fails",
    async () => {
      await api.functional.oauthServer.admin.oauthServerConfigs.at(connection, {
        id: nonExistentUUID,
      });
    },
  );

  // 8. Error test: unauthorized connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized retrieval fails", async () => {
    await api.functional.oauthServer.admin.oauthServerConfigs.at(unauthConn, {
      id: createdConfig.id,
    });
  });
}
