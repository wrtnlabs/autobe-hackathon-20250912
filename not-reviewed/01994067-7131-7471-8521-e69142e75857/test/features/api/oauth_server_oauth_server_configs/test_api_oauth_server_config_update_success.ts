import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthServerConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerConfigs";

/**
 * Test the successful update of an existing OAuth server configuration by
 * ID.
 *
 * This test covers the full lifecycle from admin registration and login to
 * creating an OAuth server configuration and updating it by ID. It
 * validates the proper reflection of changes in the update response.
 *
 * Steps:
 *
 * 1. Register an admin user with a unique email, verified email flag, and
 *    password.
 * 2. Assert that the returned authorized admin data contains valid UUID and
 *    tokens.
 * 3. Log the admin in, ensuring authentication token propagation.
 * 4. Create a new OAuth server config with randomized key, value, and
 *    description.
 * 5. Update the existing OAuth server config by ID, changing value and
 *    description.
 * 6. Assert that the updated response data matches the update request and
 *    original ID.
 */
export async function test_api_oauth_server_config_update_success(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(8);
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin user login
  const loggedInAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Create OAuth server configuration
  const configKey = `key_${RandomGenerator.alphaNumeric(6)}`;
  const configValue = RandomGenerator.alphaNumeric(10);
  const configDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const createdConfig: IOauthServerOauthServerConfigs =
    await api.functional.oauthServer.admin.oauthServerConfigs.create(
      connection,
      {
        body: {
          key: configKey,
          value: configValue,
          description: configDescription,
        } satisfies IOauthServerOauthServerConfigs.ICreate,
      },
    );
  typia.assert(createdConfig);

  // 4. Update OAuth server configuration by ID
  const updatedValue = RandomGenerator.alphaNumeric(15);
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedConfig: IOauthServerOauthServerConfigs =
    await api.functional.oauthServer.admin.oauthServerConfigs.update(
      connection,
      {
        id: createdConfig.id,
        body: {
          value: updatedValue,
          description: updatedDescription,
        } satisfies IOauthServerOauthServerConfigs.IUpdate,
      },
    );
  typia.assert(updatedConfig);

  // 5. Assertion: Updated config id matches created config id
  TestValidator.equals(
    "Updated config ID should match created config ID",
    updatedConfig.id,
    createdConfig.id,
  );

  // 6. Assertion: Updated value and description reflect changes
  TestValidator.equals(
    "Updated config value should match",
    updatedConfig.value,
    updatedValue,
  );
  TestValidator.equals(
    "Updated config description should match",
    updatedConfig.description,
    updatedDescription,
  );
}
