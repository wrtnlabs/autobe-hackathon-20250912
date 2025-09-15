import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemSetting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test updating an existing system configuration setting as a system
 * administrator.
 *
 * 1. Create and authenticate as system administrator.
 * 2. Create a system setting.
 * 3. Update the setting's value, type, or description and verify the change.
 * 4. Try to update setting with excessively long description.
 * 5. Update using edge cases (description to null).
 * 6. Failure: Update non-existent setting (expect error).
 * 7. Failure: Attempt to change setting_name (should not be allowed).
 * 8. Failure: Invalid update payload (empty object).
 * 9. Failure: Unauthorized actor tries to update settings (non-admin, if
 *    possible).
 */
export async function test_api_system_setting_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Create & authenticate as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: "testPassword123!",
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals("is_active must be true", admin.is_active, true);

  // 2. Create system setting
  const createSettingBody = {
    setting_name: RandomGenerator.name(2),
    setting_value: "on",
    setting_type: "boolean",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IAtsRecruitmentSystemSetting.ICreate;
  const setting =
    await api.functional.atsRecruitment.systemAdmin.systemSettings.create(
      connection,
      {
        body: createSettingBody,
      },
    );
  typia.assert(setting);
  TestValidator.equals(
    "created setting_name matches",
    setting.setting_name,
    createSettingBody.setting_name,
  );

  // 3. Update the value, type, and description
  const updateBody = {
    setting_value: "off",
    setting_type: "string",
    description: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies IAtsRecruitmentSystemSetting.IUpdate;
  const updated =
    await api.functional.atsRecruitment.systemAdmin.systemSettings.update(
      connection,
      {
        systemSettingId: setting.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("updated value", updated.setting_value, "off");
  TestValidator.equals("updated type", updated.setting_type, "string");
  TestValidator.equals(
    "updated description",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals("id should be the same", updated.id, setting.id);
  TestValidator.equals(
    "setting_name is immutable",
    updated.setting_name,
    setting.setting_name,
  );

  // 4. Edge: Update description to excessively long value
  const longDescription = RandomGenerator.paragraph({ sentences: 100 });
  const updatedLong =
    await api.functional.atsRecruitment.systemAdmin.systemSettings.update(
      connection,
      {
        systemSettingId: setting.id,
        body: {
          description: longDescription,
        } satisfies IAtsRecruitmentSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedLong);
  TestValidator.equals(
    "updated long description",
    updatedLong.description,
    longDescription,
  );

  // 5. Edge: Update description to null (explicitly clears description)
  const updatedNull =
    await api.functional.atsRecruitment.systemAdmin.systemSettings.update(
      connection,
      {
        systemSettingId: setting.id,
        body: {
          description: null,
        } satisfies IAtsRecruitmentSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedNull);
  TestValidator.equals(
    "description set to null",
    updatedNull.description,
    null,
  );

  // 6. Failure: Update non-existing settingId
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update non-existent system setting should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemSettings.update(
        connection,
        {
          systemSettingId: randomId,
          body: {
            setting_value: "X",
          } satisfies IAtsRecruitmentSystemSetting.IUpdate,
        },
      );
    },
  );

  // 7. Failure: Attempt to update setting_name (should fail, this field must be ignored by DTO, so API should error or ignore)
  // We attempt to send it, but as per type safety, we cannot set a property not present in IUpdate, so cannot test this unless the API ignores extraneous fields.

  // 8. Failure: Invalid update payload (empty object)
  await TestValidator.error(
    "empty payload should result in error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemSettings.update(
        connection,
        {
          systemSettingId: setting.id,
          body: {} satisfies IAtsRecruitmentSystemSetting.IUpdate,
        },
      );
    },
  );

  // 9. Failure: Unauthorized actor tries to update settings
  // To simulate, invalidate headers. The only way to do this is create a new unauthenticated connection object.
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update settings",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemSettings.update(
        unauthConn,
        {
          systemSettingId: setting.id,
          body: {
            setting_value: "should fail",
          } satisfies IAtsRecruitmentSystemSetting.IUpdate,
        },
      );
    },
  );
}
