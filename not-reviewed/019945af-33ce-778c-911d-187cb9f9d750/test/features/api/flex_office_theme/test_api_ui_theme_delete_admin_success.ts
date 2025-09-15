import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";

/**
 * This E2E test validates the deletion of a UI theme by an admin user for the
 * FlexOffice system. The test flow includes:
 *
 * 1. Admin user registration and login to obtain authorization.
 * 2. Creation of a fresh theme which is intended to be deleted.
 * 3. Deletion of the created theme, confirming successful operation.
 * 4. Attempting to delete a theme with a non-existent UUID to verify error
 *    handling.
 * 5. Attempting deletion without authentication to confirm access control
 *    enforcement. The test ensures proper authorization, successful resource
 *    manipulation, and error responses for invalid or unauthorized actions. All
 *    necessary authentication, creation, deletion API calls are verified with
 *    typia.assert for response types; error conditions are asserted with
 *    TestValidator.error using proper async-await synchrony. The test follows a
 *    realistic admin workflow and strictly uses correct DTO types and function
 *    parameters.
 */
export async function test_api_ui_theme_delete_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin user registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new theme to be deleted
  const themeCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 }),
    css: "body { background-color: #ffffff; }",
  } satisfies IFlexOfficeTheme.ICreate;

  const theme: IFlexOfficeTheme =
    await api.functional.flexOffice.admin.themes.createTheme(connection, {
      body: themeCreateBody,
    });
  typia.assert(theme);

  // 3. Delete the created theme successfully
  await api.functional.flexOffice.admin.themes.eraseTheme(connection, {
    id: theme.id,
  });

  // 4. Attempt to delete a non-existent theme and assert error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent theme should fail",
    async () => {
      await api.functional.flexOffice.admin.themes.eraseTheme(connection, {
        id: nonExistentId,
      });
    },
  );

  // 5. Attempt deletion without authentication, expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated delete request should fail",
    async () => {
      await api.functional.flexOffice.admin.themes.eraseTheme(unauthConn, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
