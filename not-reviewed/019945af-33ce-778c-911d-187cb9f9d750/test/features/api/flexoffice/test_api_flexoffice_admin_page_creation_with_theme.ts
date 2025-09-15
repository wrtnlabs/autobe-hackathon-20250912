import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";

/**
 * This test function validates the full workflow of creating a new FlexOffice
 * UI page with a linked theme by an authenticated Admin user.
 *
 * It covers:
 *
 * 1. Registering a new Admin user (join) with a unique email and password.
 * 2. Logging in the Admin user to obtain valid JWT tokens.
 * 3. Creating a new page theme with a unique theme name and optional CSS.
 * 4. Creating a new UI page linked to the created page theme using the Admin
 *    account.
 * 5. Validating returned data consistency, timestamps, and associations.
 */
export async function test_api_flexoffice_admin_page_creation_with_theme(
  connection: api.IConnection,
) {
  // 1. Admin Join: create a new admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword123";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2. Admin Login: login with the admin user
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminAuthLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthLogin);

  // 3. Create a page theme
  const themeName = `Theme_${RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 })}`;
  const themeCss = null; // No CSS specified for this theme

  const themeCreateBody = {
    name: themeName,
    css: themeCss,
  } satisfies IFlexOfficeTheme.ICreate;

  const theme: IFlexOfficeTheme =
    await api.functional.flexOffice.admin.themes.createTheme(connection, {
      body: themeCreateBody,
    });
  typia.assert(theme);

  // 4. Create a FlexOffice page linking the theme
  const pageName = `Page_${RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 })}`;
  const description = `Description: ${RandomGenerator.content({ paragraphs: 1 })}`;
  const status = "draft"; // Valid status string

  // Construct page creation body with explicit theme id
  const pageCreateBody = {
    name: pageName,
    description: description,
    status: status,
    flex_office_page_theme_id: theme.id,
  } satisfies IFlexOfficePage.ICreate;

  const page: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);

  // 5. Validate response properties
  TestValidator.equals(
    "page linked to theme id",
    page.flex_office_page_theme_id,
    theme.id,
  );
  TestValidator.equals("page name matches", page.name, pageName);
  TestValidator.equals(
    "page description matches",
    page.description,
    description,
  );
  TestValidator.equals("page status matches", page.status, status);

  // created_at and updated_at timestamps must be valid ISO strings and not null
  TestValidator.predicate(
    "page has valid created_at",
    typeof page.created_at === "string" && page.created_at.length > 0,
  );
  TestValidator.predicate(
    "page has valid updated_at",
    typeof page.updated_at === "string" && page.updated_at.length > 0,
  );

  // deleted_at should be null or undefined
  if (page.deleted_at !== undefined && page.deleted_at !== null) {
    throw new Error(
      `page.deleted_at expected to be null or undefined, but got '${page.deleted_at}'`,
    );
  }
}
