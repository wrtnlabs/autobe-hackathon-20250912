import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiEnvSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiEnvSetting";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validates that a system administrator can update an environment setting by
 * envSettingId.
 *
 * Steps:
 *
 * 1. Register and authenticate as system admin.
 * 2. Create a new environment setting (to obtain valid envSettingId).
 * 3. Update fields (env_value, env_name, changed_by, change_reason) with PUT,
 *    verifying audit and persistence.
 * 4. Ensure changes are correctly reflected (env_value, env_name, change_reason,
 *    changed_by updated, updated_at advanced, created_at unchanged).
 * 5. Check business error cases:
 *
 *    - Updating with invalid envSettingId returns error
 *    - Updating with empty body returns error
 *    - Unauthorized/unauthenticated update returns error
 * 6. Confirm response schema and audit fields behave as expected.
 */
export async function test_api_env_setting_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register as system admin
  const externalAdminId = RandomGenerator.alphaNumeric(12);
  const adminEmail = RandomGenerator.name(2).replace(" ", ".") + "@company.com";
  const joinBody = {
    external_admin_id: externalAdminId,
    email: adminEmail,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // (authenticate again to ensure login flow is well-tested)
  const loginBody = {
    external_admin_id: externalAdminId,
    email: adminEmail,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const auth = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(auth);

  // 2. Create a new env setting
  const createBody = {
    env_key: ("SPRING_S3_URL_" + RandomGenerator.alphaNumeric(8)).toUpperCase(),
    env_value: RandomGenerator.alphaNumeric(32),
    env_name: RandomGenerator.pick([
      "local",
      "development",
      "staging",
      "production",
    ] as const),
    changed_by: adminEmail,
    change_reason: RandomGenerator.paragraph(),
  } satisfies IStoryfieldAiEnvSetting.ICreate;
  const envSetting =
    await api.functional.storyfieldAi.systemAdmin.envSettings.create(
      connection,
      { body: createBody },
    );
  typia.assert(envSetting);
  TestValidator.equals(
    "env_key as input",
    envSetting.env_key,
    createBody.env_key,
  );
  TestValidator.equals(
    "env_value as input",
    envSetting.env_value,
    createBody.env_value,
  );
  TestValidator.equals(
    "changed_by as input",
    envSetting.changed_by,
    createBody.changed_by,
  );
  TestValidator.equals(
    "change_reason as input",
    envSetting.change_reason,
    createBody.change_reason,
  );

  // 3. Update the env setting: change value, env_name, reason, changed_by
  const newEnvValue = RandomGenerator.alphaNumeric(36);
  const updateBody = {
    env_value: newEnvValue,
    env_name: RandomGenerator.pick([
      "local",
      "development",
      "staging",
      "production",
    ] as const),
    change_reason: RandomGenerator.paragraph({ sentences: 3 }),
    changed_by: adminEmail,
  } satisfies IStoryfieldAiEnvSetting.IUpdate;
  const updated =
    await api.functional.storyfieldAi.systemAdmin.envSettings.update(
      connection,
      {
        envSettingId: envSetting.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated env_value as input",
    updated.env_value,
    newEnvValue,
  );
  TestValidator.equals(
    "updated env_name as input",
    updated.env_name,
    updateBody.env_name,
  );
  TestValidator.equals(
    "updated change_reason as input",
    updated.change_reason,
    updateBody.change_reason,
  );
  TestValidator.equals(
    "updated changed_by as input",
    updated.changed_by,
    updateBody.changed_by,
  );
  TestValidator.equals(
    "env_key unchanged after update",
    updated.env_key,
    envSetting.env_key,
  );
  TestValidator.equals(
    "created_at unchanged after update",
    updated.created_at,
    envSetting.created_at,
  );
  TestValidator.predicate(
    "updated_at advanced after update",
    Date.parse(updated.updated_at) > Date.parse(envSetting.updated_at),
  );

  // 5a. Update with invalid envSettingId
  await TestValidator.error(
    "updating with invalid envSettingId fails",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.envSettings.update(
        connection,
        {
          envSettingId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 5b. Update with empty body (should fail: nothing to update)
  await TestValidator.error("update with empty body fails", async () => {
    await api.functional.storyfieldAi.systemAdmin.envSettings.update(
      connection,
      {
        envSettingId: envSetting.id,
        body: {} satisfies IStoryfieldAiEnvSetting.IUpdate,
      },
    );
  });

  // 5c. Attempt update as unauthenticated/non-admin (simulate anonymous)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated update denied", async () => {
    await api.functional.storyfieldAi.systemAdmin.envSettings.update(
      unauthConn,
      {
        envSettingId: envSetting.id,
        body: updateBody,
      },
    );
  });
}
