import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiEnvSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiEnvSetting";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate that only system admins can create environment settings with correct
 * field persistence and business logic error handling.
 *
 * 1. Register system admin
 * 2. Login as admin
 * 3. Create valid environment setting and confirm persistence
 * 4. Error: duplicate key in same environment, oversize value
 * 5. Attempt creation without/with wrong auth context and expect rejection
 */
export async function test_api_env_setting_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const external_admin_id = RandomGenerator.alphaNumeric(12);
  const admin_email = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const join_result = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id,
      email: admin_email,
      actor_type: "systemAdmin",
    },
  });
  typia.assert(join_result);
  TestValidator.equals("actor_type", join_result.actor_type, "systemAdmin");

  // 2. Login as admin
  const login_result = await api.functional.auth.systemAdmin.login(connection, {
    body: { external_admin_id, email: admin_email },
  });
  typia.assert(login_result);

  // 3. Create a valid environment setting
  const valid_env_key = RandomGenerator.alphaNumeric(14).toUpperCase();
  const valid_env_value = RandomGenerator.alphaNumeric(32);
  const valid_env_name = RandomGenerator.pick([
    "development",
    "staging",
    "production",
    "local",
  ] as const);
  const valid_change_reason = RandomGenerator.paragraph({ sentences: 6 });
  const createBody = {
    env_key: valid_env_key,
    env_value: valid_env_value,
    env_name: valid_env_name,
    changed_by: admin_email,
    change_reason: valid_change_reason,
  } satisfies IStoryfieldAiEnvSetting.ICreate;
  const setting =
    await api.functional.storyfieldAi.systemAdmin.envSettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(setting);
  TestValidator.equals("env_key persistence", setting.env_key, valid_env_key);
  TestValidator.equals(
    "env_value persistence",
    setting.env_value,
    valid_env_value,
  );
  TestValidator.equals(
    "env_name persistence",
    setting.env_name,
    valid_env_name,
  );
  TestValidator.equals(
    "changed_by persistence",
    setting.changed_by,
    admin_email,
  );
  TestValidator.equals(
    "change_reason persistence",
    setting.change_reason,
    valid_change_reason,
  );

  // 4. business logic error: duplicate key in same environment
  await TestValidator.error(
    "duplicate env_key in same env_name fails",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.envSettings.create(
        connection,
        {
          body: {
            env_key: valid_env_key,
            env_value: RandomGenerator.alphaNumeric(24),
            env_name: valid_env_name,
            changed_by: admin_email,
            change_reason: "duplicate key",
          } satisfies IStoryfieldAiEnvSetting.ICreate,
        },
      );
    },
  );
  // Exceed allowed value size (simulate with oversize value for env_value)
  await TestValidator.error("oversized env_value fails", async () => {
    await api.functional.storyfieldAi.systemAdmin.envSettings.create(
      connection,
      {
        body: {
          env_key: RandomGenerator.alphaNumeric(14).toUpperCase(),
          env_value: RandomGenerator.alphaNumeric(4096 * 2), // Suppose 4K limit, try larger
          env_name: "development",
          changed_by: admin_email,
          change_reason: "too long value",
        } satisfies IStoryfieldAiEnvSetting.ICreate,
      },
    );
  });

  // 5. Attempt creation with missing or insufficient auth - expect rejection
  const unauth_connection = { ...connection, headers: {} };
  await TestValidator.error("without auth context fails", async () => {
    await api.functional.storyfieldAi.systemAdmin.envSettings.create(
      unauth_connection,
      {
        body: createBody,
      },
    );
  });
  // Simulated insufficient role is not possible (only systemAdmin join/login exists in this environment for role switching)
}
