import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";

/**
 * This end-to-end test validates the update functionality of a UI theme by an
 * admin user in the FlexOffice system. The test covers the entire flow from
 * admin registration and authentication, theme creation, theme updating, and
 * validation of the update response. It also tests error handling by attempting
 * updates with invalid theme ID and without proper authorization.
 *
 * Key steps include:
 *
 * 1. Register a new admin user and authenticate them.
 * 2. Create a new theme with a unique name and optional CSS content.
 * 3. Update the created theme by changing its name and CSS.
 * 4. Validate that the update response matches the updated data and contains
 *    expected properties.
 * 5. Attempt to update a theme with a non-existent ID and assert that an error is
 *    thrown.
 * 6. Attempt to update a theme without admin authorization and assert that an
 *    error is thrown.
 *
 * Validation ensures the proper enforcement of uniqueness, authorization, and
 * error handling.
 *
 * DTO Usage:
 *
 * - Use IFlexOfficeAdmin.ICreate for admin registration.
 * - Use IFlexOfficeAdmin.IAuthorized for admin join response.
 * - Use IFlexOfficeTheme.ICreate for theme creation request.
 * - Use IFlexOfficeTheme.IUpdate for theme update request.
 * - Use IFlexOfficeTheme for theme response validation.
 *
 * All steps are awaited to ensure proper asynchronous execution. Type safety is
 * strictly maintained using 'satisfies' with DTOs. typia.assert is used to
 * validate response data integrity.
 *
 * Errors are caught using TestValidator.error with proper async/await usage.
 */
export async function test_api_ui_theme_update_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join) and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword123!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new theme
  const themeNameOriginal = `Theme ${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 })}`;
  const themeCssOriginal = `.theme-original { background-color: #eee; }`;

  const createdTheme: IFlexOfficeTheme =
    await api.functional.flexOffice.admin.themes.createTheme(connection, {
      body: {
        name: themeNameOriginal,
        css: themeCssOriginal,
      } satisfies IFlexOfficeTheme.ICreate,
    });
  typia.assert(createdTheme);
  TestValidator.equals(
    "created theme name",
    createdTheme.name,
    themeNameOriginal,
  );

  // 3. Update the theme with new name and CSS
  const themeNameUpdated = `Updated ${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 })}`;
  const themeCssUpdated = `.theme-updated { background-color: #ccc; }`;

  const updatedTheme: IFlexOfficeTheme =
    await api.functional.flexOffice.admin.themes.updateTheme(connection, {
      id: createdTheme.id,
      body: {
        name: themeNameUpdated,
        css: themeCssUpdated,
      } satisfies IFlexOfficeTheme.IUpdate,
    });
  typia.assert(updatedTheme);

  TestValidator.equals("updated theme id", updatedTheme.id, createdTheme.id);
  TestValidator.equals(
    "updated theme name",
    updatedTheme.name,
    themeNameUpdated,
  );
  TestValidator.equals(
    "updated theme css",
    updatedTheme.css ?? null,
    themeCssUpdated,
  );

  // 4. Attempt update with invalid theme ID (expect error)
  await TestValidator.error("update with invalid theme ID fails", async () => {
    await api.functional.flexOffice.admin.themes.updateTheme(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: {
        name: "Invalid Update",
        css: null,
      } satisfies IFlexOfficeTheme.IUpdate,
    });
  });

  // 5. Attempt update without authorization
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("update without authorization fails", async () => {
    await api.functional.flexOffice.admin.themes.updateTheme(unauthConnection, {
      id: createdTheme.id,
      body: {
        name: "Unauthorized Update",
        css: null,
      } satisfies IFlexOfficeTheme.IUpdate,
    });
  });
}
