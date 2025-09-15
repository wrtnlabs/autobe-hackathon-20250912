import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";

/**
 * Test verifying that an admin user can update a FlexOffice UI page with a new
 * name, description, status and theme association.
 *
 * 1. Admin user joins and authenticates.
 * 2. Create a new page theme.
 * 3. Create a page assigned to this theme.
 * 4. Update the page with new values.
 * 5. Validate updated page properties and theme association.
 */
export async function test_api_ui_page_update_with_theme_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin join and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "password123",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new UI page theme
  const themeName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const themeDescription = RandomGenerator.content({ paragraphs: 2 });
  const createdTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.admin.pageThemes.create(connection, {
      body: {
        name: themeName,
        description: themeDescription,
      } satisfies IFlexOfficePageTheme.ICreate,
    });
  typia.assert(createdTheme);

  // 3. Create a new FlexOffice UI page assigned to the theme
  const pageName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 12,
  });
  const pageDescription = RandomGenerator.content({ paragraphs: 1 });
  const pageStatus = RandomGenerator.pick([
    "draft",
    "published",
    "archived",
  ] as const);
  const createdPage: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: {
        flex_office_page_theme_id: createdTheme.id,
        name: pageName,
        description: pageDescription,
        status: pageStatus,
      } satisfies IFlexOfficePage.ICreate,
    });
  typia.assert(createdPage);

  // 4. Update the created page with new properties
  const newPageName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 15,
  });
  const newPageDescription = RandomGenerator.content({ paragraphs: 2 });
  const newPageStatus = RandomGenerator.pick([
    "draft",
    "published",
    "archived",
  ] as const);

  // Create another theme to switch theme ID
  const alternateThemeName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 12,
  });
  const alternateThemeDesc = RandomGenerator.content({ paragraphs: 1 });
  const alternateTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.admin.pageThemes.create(connection, {
      body: {
        name: alternateThemeName,
        description: alternateThemeDesc,
      } satisfies IFlexOfficePageTheme.ICreate,
    });
  typia.assert(alternateTheme);

  // Prepare update body
  const updateBody = {
    name: newPageName,
    description: newPageDescription,
    status: newPageStatus,
    flex_office_page_theme_id: alternateTheme.id,
  } satisfies IFlexOfficePage.IUpdate;

  const updatedPage: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.update(connection, {
      pageId: createdPage.id,
      body: updateBody,
    });
  typia.assert(updatedPage);

  // 5. Validate updated page
  TestValidator.equals("page id unchanged", updatedPage.id, createdPage.id);
  TestValidator.equals(
    "page name updated",
    updatedPage.name,
    updateBody.name as string,
  );
  TestValidator.equals(
    "page description updated",
    updatedPage.description,
    updateBody.description as string,
  );
  TestValidator.equals(
    "page status updated",
    updatedPage.status,
    updateBody.status!,
  );
  TestValidator.equals(
    "page theme id updated",
    updatedPage.flex_office_page_theme_id as string,
    alternateTheme.id,
  );

  // Timestamps verification: updated_at should be greater or equal created_at
  const createdAt = new Date(createdPage.created_at).getTime();
  const updatedAt = new Date(updatedPage.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is newer or equal to created_at",
    updatedAt >= createdAt,
  );
  // created_at should remain unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedPage.created_at,
    createdPage.created_at,
  );
}
