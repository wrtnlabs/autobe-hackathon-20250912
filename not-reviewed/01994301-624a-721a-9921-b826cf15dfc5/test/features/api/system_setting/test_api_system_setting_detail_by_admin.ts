import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemSetting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test fetching the details of a specific system setting by ID as a system
 * admin. Successful fetch should return all setting fields as expected. Test
 * error scenarios for invalid systemSettingId and unauthorized access.
 *
 * Business logic:
 *
 * 1. Register a unique system admin account for the test (random email, password,
 *    name, super_admin: true)
 * 2. Create a new system setting with random values and unique setting_name
 * 3. As the admin, fetch the system setting detail by its id; verify all fields
 *    match what was created
 * 4. Attempt to fetch with a random invalid/non-existent ID and expect error
 * 5. Attempt to fetch as an unauthorized user and expect a permission error
 *
 * Success is only system admin can access the detail, fields are correct, and
 * appropriate errors are raised for failures.
 */
export async function test_api_system_setting_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new system setting
  const settingBody = {
    setting_name: RandomGenerator.alphaNumeric(10),
    setting_value: RandomGenerator.alphabets(8),
    setting_type: RandomGenerator.pick([
      "string",
      "int",
      "boolean",
      "json",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentSystemSetting.ICreate;
  const created: IAtsRecruitmentSystemSetting =
    await api.functional.atsRecruitment.systemAdmin.systemSettings.create(
      connection,
      {
        body: settingBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "setting_name matches on creation",
    created.setting_name,
    settingBody.setting_name,
  );
  TestValidator.equals(
    "setting_type matches",
    created.setting_type,
    settingBody.setting_type,
  );
  TestValidator.equals(
    "setting_value matches",
    created.setting_value,
    settingBody.setting_value,
  );
  TestValidator.equals(
    "description matches",
    created.description,
    settingBody.description,
  );

  // 3. Fetch detail by ID as admin
  const detail: IAtsRecruitmentSystemSetting =
    await api.functional.atsRecruitment.systemAdmin.systemSettings.at(
      connection,
      {
        systemSettingId: created.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("detail ID matches created", detail.id, created.id);
  TestValidator.equals(
    "setting_name in detail",
    detail.setting_name,
    settingBody.setting_name,
  );
  TestValidator.equals(
    "setting_type in detail",
    detail.setting_type,
    settingBody.setting_type,
  );
  TestValidator.equals(
    "setting_value in detail",
    detail.setting_value,
    settingBody.setting_value,
  );
  TestValidator.equals(
    "description in detail",
    detail.description,
    settingBody.description,
  );

  // 4. Error on invalid/nonexistent systemSettingId
  await TestValidator.error(
    "fetching with invalid/nonexistent ID should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemSettings.at(
        connection,
        {
          systemSettingId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Try fetching as unauthorized user (no token, should get permission error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot fetch system setting details",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemSettings.at(
        unauthConn,
        {
          systemSettingId: created.id,
        },
      );
    },
  );
}
