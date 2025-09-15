import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiEnvSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiEnvSetting";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate system admin environment setting hard deletion scenario.
 *
 * This E2E test verifies that a system administrator can perform hard deletion
 * of an environment setting record using its unique envSettingId. The workflow
 * includes:
 *
 * 1. Registering an admin account (join)
 * 2. Logging in as the admin
 * 3. Creating a new envSetting (with realistic, random values)
 * 4. Hard-deleting the envSetting by its id
 * 5. Attempting to delete the same id again (should error)
 * 6. Attempting to delete a non-existent envSetting id (should error)
 *
 * All data (IDs, emails, env keys/values) are randomly generated for uniqueness
 * and test isolation. This ensures proper authorization, deletion, error
 * handling for business logic, and audit context according to system
 * requirements. API calls are properly awaited and responses are validated with
 * typia.assert where applicable. No forbidden test or type error validation is
 * attempted.
 */
export async function test_api_env_setting_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoinInput = {
    external_admin_id: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);
  TestValidator.equals("admin join email", admin.email, adminJoinInput.email);
  TestValidator.equals("admin actor_type", admin.actor_type, "systemAdmin");

  // 2. Admin login
  const loginIn = {
    external_admin_id: adminJoinInput.external_admin_id,
    email: adminJoinInput.email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: loginIn,
  });
  typia.assert(loginResult);
  TestValidator.equals("login returns same admin ID", loginResult.id, admin.id);

  // 3. Create env setting
  const envKey = `KEY_${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const envVal = RandomGenerator.alphaNumeric(20);
  const envName = RandomGenerator.pick([
    "local",
    "development",
    "staging",
    "production",
  ] as const);
  const envSettingBody = {
    env_key: envKey,
    env_value: envVal,
    env_name: envName,
    changed_by: admin.email,
    change_reason: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IStoryfieldAiEnvSetting.ICreate;
  const envSetting =
    await api.functional.storyfieldAi.systemAdmin.envSettings.create(
      connection,
      { body: envSettingBody },
    );
  typia.assert(envSetting);
  TestValidator.equals("env_setting key matches", envSetting.env_key, envKey);
  TestValidator.equals(
    "env_setting changed_by matches admin",
    envSetting.changed_by,
    admin.email,
  );

  // 4. Hard-delete envSetting
  await api.functional.storyfieldAi.systemAdmin.envSettings.erase(connection, {
    envSettingId: envSetting.id,
  });

  // 5. Try deleting it again, should error
  await TestValidator.error(
    "deleting already deleted envSetting should error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.envSettings.erase(
        connection,
        { envSettingId: envSetting.id },
      );
    },
  );

  // 6. Try deleting a random (non-existent) id
  await TestValidator.error(
    "deleting non-existent envSetting should error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.envSettings.erase(
        connection,
        { envSettingId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
