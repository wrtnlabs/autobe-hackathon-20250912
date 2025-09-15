import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingSystemConfig";

/**
 * Test the creation of a new system configuration entry by a properly
 * authenticated moderator user.
 *
 * The test performs moderator user registration and login to establish
 * authentication. Then it creates a system configuration entry with a valid
 * key, value, and description. It asserts the response contains the created
 * entry with accurate timestamps. This validates proper authorization,
 * configuration creation, and response shape.
 */
export async function test_api_system_config_create_success(
  connection: api.IConnection,
) {
  // 1. Create a new moderator user and establish authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32);
  const moderatorUsername = RandomGenerator.name();

  // Call moderator join API
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a system configuration entry by authenticated moderator
  const systemConfigKey = RandomGenerator.alphaNumeric(12);
  const systemConfigValue = RandomGenerator.alphaNumeric(12);
  const systemConfigDescription = RandomGenerator.paragraph({ sentences: 5 });

  const systemConfig: IRecipeSharingSystemConfig =
    await api.functional.recipeSharing.moderator.systemConfig.create(
      connection,
      {
        body: {
          key: systemConfigKey,
          value: systemConfigValue,
          description: systemConfigDescription,
        } satisfies IRecipeSharingSystemConfig.ICreate,
      },
    );
  typia.assert(systemConfig);

  // 3. Validate returned data
  TestValidator.equals(
    "systemConfig.key matches",
    systemConfig.key,
    systemConfigKey,
  );
  TestValidator.equals(
    "systemConfig.value matches",
    systemConfig.value,
    systemConfigValue,
  );
  TestValidator.equals(
    "systemConfig.description matches",
    systemConfig.description,
    systemConfigDescription,
  );
  TestValidator.predicate(
    "systemConfig.created_at is valid date-time",
    !isNaN(Date.parse(systemConfig.created_at)),
  );
  TestValidator.predicate(
    "systemConfig.updated_at is valid date-time",
    !isNaN(Date.parse(systemConfig.updated_at)),
  );
}
