import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemSettings";

export async function test_api_system_settings_get_detail_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create an admin user account through join to enable admin role actions
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Admin login to obtain access tokens
  const login: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(login);

  // Step 3: Create a new system setting entity to acquire a valid ID
  const settingKey = `test_setting_${RandomGenerator.alphaNumeric(5)}`;
  const settingValue = `value_${RandomGenerator.alphaNumeric(8)}`;
  const settingDescription = `Description for ${settingKey}`;

  const setting: IFlexOfficeSystemSettings =
    await api.functional.flexOffice.admin.systemSettings.create(connection, {
      body: {
        key: settingKey,
        value: settingValue,
        description: settingDescription,
      } satisfies IFlexOfficeSystemSettings.ICreate,
    });
  typia.assert(setting);

  // Step 4: Successful retrieval of the system setting by its ID
  const retrieved: IFlexOfficeSystemSettings =
    await api.functional.flexOffice.admin.systemSettings.at(connection, {
      id: setting.id,
    });
  typia.assert(retrieved);

  TestValidator.equals(
    "retrieved setting id matches created id",
    retrieved.id,
    setting.id,
  );
  TestValidator.equals(
    "retrieved setting key matches",
    retrieved.key,
    settingKey,
  );
  TestValidator.equals(
    "retrieved setting value matches",
    retrieved.value,
    settingValue,
  );
  TestValidator.equals(
    "retrieved setting description matches",
    retrieved.description,
    settingDescription,
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?Z$/.test(
      retrieved.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?Z$/.test(
      retrieved.updated_at,
    ),
  );

  // Step 5: Test unauthorized access by using an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.flexOffice.admin.systemSettings.at(
      unauthenticatedConnection,
      {
        id: setting.id,
      },
    );
  });

  // Step 6: Test retrieval of non-existent ID returns 404 error
  await TestValidator.error("non-existent ID should fail", async () => {
    await api.functional.flexOffice.admin.systemSettings.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
