import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignAdmin";
import type { IEasySignEasySignConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignEasySignConfigurations";

/**
 * Test EasySign system configuration retrieval by ID with authenticated
 * admin.
 *
 * This test verifies that an admin user can successfully create an admin
 * account, receive authentication tokens, and retrieve specific EasySign
 * system configuration entries by ID. The test confirms JWT token handling,
 * authorization, and correct retrieval of configuration details.
 *
 * Business Context: The EasySign system provides global system
 * configurations accessible only by admin users. Proper authentication and
 * token management are critical for protecting sensitive configuration
 * data.
 *
 * Workflow:
 *
 * 1. Create an administrator account with a unique email and username.
 * 2. Authenticate and receive authorization tokens automatically applied to
 *    connection.
 * 3. Request EasySign configuration by a valid UUID ID.
 * 4. Assert that the retrieved configuration matches the requested ID and all
 *    required fields are present and valid.
 */
export async function test_api_easy_sign_configurations_at_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(2),
  } satisfies IEasySignAdmin.ICreate;

  const adminAuth: IEasySignAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });

  typia.assert(adminAuth);

  // 2. Use authenticated connection to call configuration at endpoint
  // Generate a random valid UUID for configuration id
  const configId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const config: IEasySignEasySignConfigurations =
    await api.functional.easySign.admin.easySignConfigurations.at(connection, {
      id: configId,
    });

  // Fully validate the returned configuration
  typia.assert(config);

  // 3. Confirm the response ID matches the requested ID
  TestValidator.equals(
    "EasySign configuration id should match the requested id",
    config.id,
    configId,
  );

  // 4. Confirm mandatory fields exist and are of expected types
  TestValidator.predicate(
    "config_key is a non-empty string",
    typeof config.config_key === "string" && config.config_key.length > 0,
  );
  TestValidator.predicate(
    "config_value is a string",
    typeof config.config_value === "string",
  );

  // 5. description can be null or string
  if (config.description !== null && config.description !== undefined) {
    TestValidator.predicate(
      "description is string when not null",
      typeof config.description === "string",
    );
  } else {
    TestValidator.equals(
      "description is null or undefined",
      config.description ?? null,
      null,
    );
  }

  TestValidator.predicate(
    "created_at is ISO 8601 date-time string",
    typeof config.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time string",
    typeof config.updated_at === "string",
  );

  // 6. deleted_at can be nullable
  if (config.deleted_at !== null && config.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO 8601 date-time string when not null",
      typeof config.deleted_at === "string",
    );
  } else {
    TestValidator.equals(
      "deleted_at is null or undefined",
      config.deleted_at ?? null,
      null,
    );
  }
}
