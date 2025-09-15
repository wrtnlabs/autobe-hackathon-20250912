import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemSettings";

/**
 * This test validates the creation of a new system setting by an authorized
 * admin user. It performs admin registration, login, and uses the obtained JWT
 * to create a setting. It checks that duplicate keys are rejected and
 * unauthorized users cannot create settings.
 */
export async function test_api_system_settings_creation(
  connection: api.IConnection,
) {
  // Admin registration with unique email and password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPass123!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // Admin login to get fresh tokens and authentication context
  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // Create a new system setting with unique key, optional value and description
  const systemSettingKey = `setting_${RandomGenerator.alphabets(10)}`;
  const settingValueNullable: string | null = RandomGenerator.paragraph({
    sentences: 3,
  });
  const settingDescriptionNullable: string | null = RandomGenerator.content({
    paragraphs: 1,
  });
  const createBody = {
    key: systemSettingKey,
    value: settingValueNullable,
    description: settingDescriptionNullable,
  } satisfies IFlexOfficeSystemSettings.ICreate;

  // Initial creation should succeed
  const created: IFlexOfficeSystemSettings =
    await api.functional.flexOffice.admin.systemSettings.create(connection, {
      body: createBody,
    });

  typia.assert(created);
  TestValidator.predicate(
    "created system setting has valid uuid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      created.id,
    ),
  );
  TestValidator.equals(
    "created system setting key matches",
    created.key,
    systemSettingKey,
  );
  TestValidator.equals(
    "created system setting value matches",
    created.value,
    settingValueNullable,
  );
  TestValidator.equals(
    "created system setting description matches",
    created.description,
    settingDescriptionNullable,
  );

  // Check created_at and updated_at are valid ISO 8601 date strings
  TestValidator.predicate(
    "created_at is ISO8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(
      created.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(
      created.updated_at,
    ),
  );

  // Attempt creating a setting with the same key should error
  await TestValidator.error("duplicate key creation should fail", async () => {
    await api.functional.flexOffice.admin.systemSettings.create(connection, {
      body: {
        key: systemSettingKey, // duplicate key
        value: "Some different value",
        description: "Some different description",
      } satisfies IFlexOfficeSystemSettings.ICreate,
    });
  });

  // Unauthorized connections (without valid tokens) should not be allowed
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot create system setting",
    async () => {
      await api.functional.flexOffice.admin.systemSettings.create(
        unauthorizedConn,
        {
          body: {
            key: `unauth_${RandomGenerator.alphabets(10)}`,
            value: "Unauthorized",
            description: "Should not be created",
          } satisfies IFlexOfficeSystemSettings.ICreate,
        },
      );
    },
  );
}
