import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemSetting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate secure and privileged deletion (soft-delete) of a system setting.
 *
 * 1. Register and authenticate system admin.
 * 2. Create a system setting as admin, capturing ID.
 * 3. Delete the system setting.
 * 4. Validate soft-delete (deleted_at is set after deletion, setting not
 *    available).
 * 5. Attempt deletion with unauthenticated and invalid context (should fail).
 * 6. Attempt to delete again or delete non-existent ID (should fail).
 */
export async function test_api_system_setting_delete_success_and_authorization(
  connection: api.IConnection,
) {
  // 1. Register and authenticate system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminBody = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Create system setting as admin
  const sysSettingBody = {
    setting_name: RandomGenerator.name(),
    setting_value: RandomGenerator.alphaNumeric(10),
    setting_type: RandomGenerator.pick([
      "string",
      "int",
      "boolean",
      "json",
    ] as const),
    description: RandomGenerator.paragraph(),
  } satisfies IAtsRecruitmentSystemSetting.ICreate;
  const sysSetting =
    await api.functional.atsRecruitment.systemAdmin.systemSettings.create(
      connection,
      { body: sysSettingBody },
    );
  typia.assert(sysSetting);

  // 3. Delete the system setting as admin
  await api.functional.atsRecruitment.systemAdmin.systemSettings.erase(
    connection,
    { systemSettingId: sysSetting.id },
  );

  // 4. Validate soft-delete by retrieving the setting (assume fetch or re-create fails/returns deleted)
  // No direct GET endpoint to fetch or check listing; so simulate by attempting second delete (should fail)
  await TestValidator.error(
    "Deleting already deleted system setting should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemSettings.erase(
        connection,
        { systemSettingId: sysSetting.id },
      );
    },
  );

  // 5. Attempt deletion as unauthenticated (anonymous) user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized deletion attempt should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemSettings.erase(
        unauthConn,
        { systemSettingId: sysSetting.id },
      );
    },
  );

  // 6. Attempt to delete random non-existent id
  await TestValidator.error(
    "Deleting non-existent system setting should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemSettings.erase(
        connection,
        {
          systemSettingId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
