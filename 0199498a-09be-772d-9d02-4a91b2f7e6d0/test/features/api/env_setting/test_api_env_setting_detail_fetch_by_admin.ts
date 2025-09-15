import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiEnvSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiEnvSetting";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate system administrator can fetch detailed environment setting info and
 * all audit fields, while enforcing access restrictions.
 *
 * 1. Register and login as a new system admin.
 * 2. Create a new environment setting as admin and record the `envSettingId`.
 * 3. Fetch environment setting details by id and validate all fields match
 *    (env_key, env_value, env_name, changed_by, change_reason, created_at,
 *    updated_at, deleted_at).
 * 4. Attempt to fetch using a non-existent UUID to confirm correct error handling.
 * 5. Attempt to fetch using an unauthenticated connection to confirm access is
 *    denied.
 */
export async function test_api_env_setting_detail_fetch_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const externalAdminId = RandomGenerator.alphaNumeric(10);
  const joinOutput = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      external_admin_id: externalAdminId,
      actor_type: "systemAdmin",
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(joinOutput);
  const loginOutput = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      external_admin_id: externalAdminId,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  typia.assert(loginOutput);

  // Step 2: Create environment setting
  const envKey = RandomGenerator.alphaNumeric(12).toUpperCase();
  const envValue = RandomGenerator.alphaNumeric(32);
  const envName = RandomGenerator.pick([
    "development",
    "staging",
    "production",
    "local",
  ] as const);
  const changeReason = RandomGenerator.paragraph({ sentences: 2 });
  const createEnvSetting =
    await api.functional.storyfieldAi.systemAdmin.envSettings.create(
      connection,
      {
        body: {
          env_key: envKey,
          env_value: envValue,
          env_name: envName,
          changed_by: adminEmail,
          change_reason: changeReason,
        } satisfies IStoryfieldAiEnvSetting.ICreate,
      },
    );
  typia.assert(createEnvSetting);

  // Step 3: Fetch env setting detail by id
  const fetched = await api.functional.storyfieldAi.systemAdmin.envSettings.at(
    connection,
    {
      envSettingId: createEnvSetting.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals("env_key matches", fetched.env_key, envKey);
  TestValidator.equals("env_value matches", fetched.env_value, envValue);
  TestValidator.equals("env_name matches", fetched.env_name, envName);
  TestValidator.equals("changed_by matches", fetched.changed_by, adminEmail);
  TestValidator.equals(
    "change_reason matches",
    fetched.change_reason,
    changeReason,
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    fetched.deleted_at,
    null,
  );

  // Step 4: Fetch with non-existent UUID
  await TestValidator.error(
    "fetching non-existent envSetting id should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.envSettings.at(connection, {
        envSettingId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Step 5: Fetch as unauthenticated (context removal)
  const unauth: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "fetching envSetting as unauthenticated should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.envSettings.at(unauth, {
        envSettingId: createEnvSetting.id,
      });
    },
  );
}
