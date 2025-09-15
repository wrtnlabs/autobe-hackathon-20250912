import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * Test retrieval of UI page theme details by a viewer user using a valid
 * pageThemeId.
 *
 * The test covers full workflow:
 *
 * 1. Create admin user and login to obtain tokens.
 * 2. Admin creates a UI page theme with unique name and description.
 * 3. Create viewer user and login to obtain tokens.
 * 4. Viewer retrieves the created page theme by ID.
 * 5. Validates that retrieved theme matches exactly the created theme.
 *
 * This test ensures authorization handling, data integrity, and API reliable
 * retrieval of UI page themes.
 */
export async function test_api_flexoffice_viewer_pagetheme_retrieve_valid_id(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword123!";
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login
  const adminLoginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Admin creates a page theme
  const pageThemeName = `test-theme-${RandomGenerator.alphaNumeric(8)}`;
  const pageThemeDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const createdPageTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.admin.pageThemes.create(connection, {
      body: {
        name: pageThemeName,
        description: pageThemeDescription,
      } satisfies IFlexOfficePageTheme.ICreate,
    });
  typia.assert(createdPageTheme);

  // 4. Viewer join
  const viewerName = RandomGenerator.name(2);
  const viewerEmail: string = typia.random<string & tags.Format<"email">>();
  const viewerPassword = "StrongPassword123!";
  const viewerAuthorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: {
        name: viewerName,
        email: viewerEmail,
        password: viewerPassword,
      } satisfies IFlexOfficeViewer.ICreate,
    });
  typia.assert(viewerAuthorized);

  // 5. Viewer login
  const viewerLoginAuthorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, {
      body: {
        email: viewerEmail,
        password: viewerPassword,
      } satisfies IFlexOfficeViewer.ILogin,
    });
  typia.assert(viewerLoginAuthorized);

  // 6. Viewer retrieves the page theme by ID
  const retrievedPageTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.viewer.pageThemes.at(connection, {
      pageThemeId: createdPageTheme.id,
    });
  typia.assert(retrievedPageTheme);

  // 7. Validate the retrieved page theme matches the created one
  TestValidator.equals(
    "Page theme id matches",
    retrievedPageTheme.id,
    createdPageTheme.id,
  );
  TestValidator.equals(
    "Page theme name matches",
    retrievedPageTheme.name,
    createdPageTheme.name,
  );
  TestValidator.equals(
    "Page theme description matches",
    retrievedPageTheme.description ?? null,
    createdPageTheme.description ?? null,
  );
  TestValidator.predicate(
    "Page theme created_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      retrievedPageTheme.created_at,
    ),
  );
  TestValidator.predicate(
    "Page theme updated_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      retrievedPageTheme.updated_at,
    ),
  );
}
