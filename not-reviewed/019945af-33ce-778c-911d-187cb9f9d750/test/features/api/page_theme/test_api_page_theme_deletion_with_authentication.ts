import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";

/**
 * This E2E test validates secure deletion of a UI page theme entity.
 *
 * It follows these steps:
 *
 * 1. Register and log in as a new admin user to obtain JWT tokens
 * 2. Create a new page theme record
 * 3. Delete the created page theme and verify the deletion response
 * 4. Attempt to delete a non-existent page theme, expect a 404 error
 * 5. Attempt to delete a page theme with insufficient authorization and expect a
 *    401 or 403 error
 */
export async function test_api_page_theme_deletion_with_authentication(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "strongPassword123!";
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLoggedIn: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // 3. Create a page theme
  const pageThemeCreateBody = {
    name: `test-theme-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IFlexOfficePageTheme.ICreate;

  const createdPageTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.admin.pageThemes.create(connection, {
      body: pageThemeCreateBody,
    });
  typia.assert(createdPageTheme);

  // 4. Delete the created page theme (expect HTTP 204 success)
  await api.functional.flexOffice.admin.pageThemes.erasePageTheme(connection, {
    pageThemeId: createdPageTheme.id,
  });

  // 5. Attempt to delete the same page theme again which no longer exists (expect error 404)
  await TestValidator.error(
    "delete non-existent page theme returns error",
    async () => {
      await api.functional.flexOffice.admin.pageThemes.erasePageTheme(
        connection,
        {
          pageThemeId: createdPageTheme.id,
        },
      );
    },
  );

  // 6. Register a second admin user to test insufficient authorization scenario
  const otherAdminEmail = typia.random<string & tags.Format<"email">>();
  const otherAdminPassword = "anotherStrongPass!456";
  const otherAdminCreateBody = {
    email: otherAdminEmail,
    password: otherAdminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;

  const otherAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: otherAdminCreateBody,
    });
  typia.assert(otherAdmin);

  // 7. Admin login as other admin
  const otherAdminLoginBody = {
    email: otherAdminEmail,
    password: otherAdminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;

  await api.functional.auth.admin.login(connection, {
    body: otherAdminLoginBody,
  });

  // 8. Create a new page theme using the other admin user for testing
  const pageThemeForDeletion = {
    name: `test-theme-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IFlexOfficePageTheme.ICreate;

  const newPageTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.admin.pageThemes.create(connection, {
      body: pageThemeForDeletion,
    });
  typia.assert(newPageTheme);

  // 9. Simulate insufficient permissions by cloning connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 10. Attempt to delete page theme with unauthenticated connection (expect 401 or 403 error)
  await TestValidator.error(
    "deleting page theme without authorization should fail",
    async () => {
      await api.functional.flexOffice.admin.pageThemes.erasePageTheme(
        unauthenticatedConnection,
        { pageThemeId: newPageTheme.id },
      );
    },
  );
}
