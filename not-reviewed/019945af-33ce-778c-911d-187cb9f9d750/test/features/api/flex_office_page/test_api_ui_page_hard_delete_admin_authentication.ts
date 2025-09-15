import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";

/**
 * Test the hard deletion of a UI page via admin API.
 *
 * This test verifies the workflow of an admin user:
 *
 * 1. Admin user creation and authentication.
 * 2. Creation of a new UI page theme.
 * 3. Creation of a new UI page referencing the theme.
 * 4. Hard deletion of the created UI page.
 * 5. Validation that the deletion was successful by attempting a repeated
 *    deletion, since fetching the page for confirmation is unsupported.
 *
 * It confirms authorization, data creation, hard deletion operation, and proper
 * error handling for deleting non-existent resources.
 */
export async function test_api_ui_page_hard_delete_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin join to get authentication token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create UI page theme for linking to page
  const themeName = RandomGenerator.name(2);
  const themeDescription = RandomGenerator.paragraph({ sentences: 5 });
  const theme = await api.functional.flexOffice.admin.pageThemes.create(
    connection,
    {
      body: {
        name: themeName,
        description: themeDescription,
      } satisfies IFlexOfficePageTheme.ICreate,
    },
  );
  typia.assert(theme);

  // 3. Create UI page referencing the theme
  const pageName = RandomGenerator.name(3);
  const pageDescription = RandomGenerator.paragraph({ sentences: 8 });
  const pageStatus = "draft";
  const page = await api.functional.flexOffice.admin.pages.create(connection, {
    body: {
      name: pageName,
      description: pageDescription,
      status: pageStatus,
      flex_office_page_theme_id: theme.id,
    } satisfies IFlexOfficePage.ICreate,
  });
  typia.assert(page);

  // 4. Hard delete the created UI page
  await api.functional.flexOffice.admin.pages.erase(connection, {
    pageId: page.id,
  });

  // 5. Validate deletion:
  // Since GET endpoint for fetching page by ID is undefined or unavailable,
  // we validate hard deletion by expecting error on repeated deletion attempt.
  await TestValidator.error(
    "deleting same page again should fail",
    async () => {
      await api.functional.flexOffice.admin.pages.erase(connection, {
        pageId: page.id,
      });
    },
  );
}
