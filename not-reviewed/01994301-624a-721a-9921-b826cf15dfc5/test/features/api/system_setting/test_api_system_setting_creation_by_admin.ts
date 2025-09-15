import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemSetting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for creation of a new system setting by a system admin.
 *
 * - Registers a new system admin
 * - Creates a system setting with unique name
 * - Verifies success and field correctness
 * - Attempts duplicate (should fail)
 * - Attempts creation with missing required fields (should fail)
 * - Attempts unauthorized creation (should fail)
 */
export async function test_api_system_setting_creation_by_admin(
  connection: api.IConnection,
) {
  // Register a system admin and become authenticated
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);
  // --- AUTHED FROM NOW (connection.headers is set internally) ---

  // 1. Happy path - unique setting creation
  const baseName = RandomGenerator.alphaNumeric(10);
  const settingInput = {
    setting_name: baseName,
    setting_value: RandomGenerator.alphaNumeric(12),
    setting_type: RandomGenerator.pick([
      "string",
      "int",
      "boolean",
      "json",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IAtsRecruitmentSystemSetting.ICreate;
  const created =
    await api.functional.atsRecruitment.systemAdmin.systemSettings.create(
      connection,
      { body: settingInput },
    );
  typia.assert(created);
  // Must reflect input data
  TestValidator.equals(
    "setting_name matches",
    created.setting_name,
    settingInput.setting_name,
  );
  TestValidator.equals(
    "setting_value matches",
    created.setting_value,
    settingInput.setting_value,
  );
  TestValidator.equals(
    "setting_type matches",
    created.setting_type,
    settingInput.setting_type,
  );
  TestValidator.equals(
    "description matches",
    created.description,
    settingInput.description,
  );

  // 2. Duplicate setting_name (should fail)
  await TestValidator.error("duplicate setting_name should fail", async () => {
    await api.functional.atsRecruitment.systemAdmin.systemSettings.create(
      connection,
      {
        body: {
          ...settingInput,
          setting_value: "other-value",
        } satisfies IAtsRecruitmentSystemSetting.ICreate,
      },
    );
  });

  // 3. Missing required fields (one by one)
  for (const missing of [
    "setting_name",
    "setting_type",
    "setting_value",
  ] as const) {
    const corrupt = { ...settingInput };
    delete (corrupt as any)[missing];
    await TestValidator.error(
      `missing required field: ${missing}`,
      async () => {
        await api.functional.atsRecruitment.systemAdmin.systemSettings.create(
          connection,
          { body: corrupt },
        );
      },
    );
  }

  // 4. Unauthenticated creation (simulate no Authorization)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot create system setting",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemSettings.create(
        unauthConn,
        { body: settingInput },
      );
    },
  );
}
