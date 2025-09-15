import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemSettings";

export async function test_api_system_setting_update_success_and_validation(
  connection: api.IConnection,
) {
  // 1. Admin user signs up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "password123";
  const adminUser: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Admin user logs in
  const loginResult: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loginResult);

  // 3. Create a new system setting
  const createBody = {
    key: `testKey${RandomGenerator.alphaNumeric(6)}`,
    value: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IFlexOfficeSystemSettings.ICreate;

  const createdSetting: IFlexOfficeSystemSettings =
    await api.functional.flexOffice.admin.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(createdSetting);

  // 4. Update the system setting with new values
  const updateBody = {
    key: `updatedKey${RandomGenerator.alphaNumeric(6)}`,
    value: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IFlexOfficeSystemSettings.IUpdate;

  const updatedSetting: IFlexOfficeSystemSettings =
    await api.functional.flexOffice.admin.systemSettings.update(connection, {
      id: createdSetting.id,
      body: updateBody,
    });
  typia.assert(updatedSetting);

  // Validate the updated fields are changed as requested
  TestValidator.equals("updated key", updatedSetting.key, updateBody.key);
  TestValidator.equals(
    "updated value",
    updatedSetting.value ?? null,
    updateBody.value ?? null,
  );
  TestValidator.equals(
    "updated description",
    updatedSetting.description ?? null,
    updateBody.description ?? null,
  );

  // 5. Retrieve the system setting and verify update
  const retrievedSetting: IFlexOfficeSystemSettings =
    await api.functional.flexOffice.admin.systemSettings.at(connection, {
      id: createdSetting.id,
    });
  typia.assert(retrievedSetting);
  TestValidator.equals(
    "retrieved key matches update",
    retrievedSetting.key,
    updatedSetting.key,
  );
  TestValidator.equals(
    "retrieved value matches update",
    retrievedSetting.value ?? null,
    updatedSetting.value ?? null,
  );
  TestValidator.equals(
    "retrieved description matches update",
    retrievedSetting.description ?? null,
    updatedSetting.description ?? null,
  );

  // 6. Attempt to update with a duplicate key - should fail
  await TestValidator.error("duplicate key update should fail", async () => {
    await api.functional.flexOffice.admin.systemSettings.update(connection, {
      id: createdSetting.id,
      body: {
        key: updatedSetting.key, // same key as already updated one
      } satisfies IFlexOfficeSystemSettings.IUpdate,
    });
  });

  // 7. Attempt to update with invalid UUID - should fail
  await TestValidator.error(
    "update with invalid UUID should fail",
    async () => {
      await api.functional.flexOffice.admin.systemSettings.update(connection, {
        id: "invalid-uuid-string",
        body: {
          key: `key${RandomGenerator.alphaNumeric(4)}`,
        } satisfies IFlexOfficeSystemSettings.IUpdate,
      });
    },
  );

  // 8. Attempt unauthorized update - create new unauthenticated connection and attempt update
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.flexOffice.admin.systemSettings.update(
      unauthenticatedConnection,
      {
        id: createdSetting.id,
        body: {
          key: `unauthKey${RandomGenerator.alphaNumeric(5)}`,
        } satisfies IFlexOfficeSystemSettings.IUpdate,
      },
    );
  });
}
