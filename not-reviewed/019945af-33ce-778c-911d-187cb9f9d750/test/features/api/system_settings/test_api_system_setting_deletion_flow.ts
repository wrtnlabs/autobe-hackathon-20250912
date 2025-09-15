import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemSettings";

export async function test_api_system_setting_deletion_flow(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "S3cureP@ssw0rd!",
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(adminAuthorized);

  // 2. Login the admin user
  const adminLogin = {
    email: adminCreate.email,
    password: adminCreate.password,
  } satisfies IFlexOfficeAdmin.ILogin;
  const loginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLogin });
  typia.assert(loginAuthorized);

  // 3. Create a new system setting
  const systemSettingCreate = {
    key: `system_setting_${RandomGenerator.alphabets(6)}`,
    value: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IFlexOfficeSystemSettings.ICreate;
  const systemSetting: IFlexOfficeSystemSettings =
    await api.functional.flexOffice.admin.systemSettings.create(connection, {
      body: systemSettingCreate,
    });
  typia.assert(systemSetting);

  // 4. Perform deletion of the created system setting
  await api.functional.flexOffice.admin.systemSettings.eraseSystemSetting(
    connection,
    { id: systemSetting.id },
  );

  // 5. Attempt to delete a non-existent system setting with random UUID
  await TestValidator.error(
    "delete should fail for non-existent system setting",
    async () => {
      await api.functional.flexOffice.admin.systemSettings.eraseSystemSetting(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Attempt to delete a system setting with unauthorized connection
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("delete unauthorized without login", async () => {
    await api.functional.flexOffice.admin.systemSettings.eraseSystemSetting(
      unauthorizedConnection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
