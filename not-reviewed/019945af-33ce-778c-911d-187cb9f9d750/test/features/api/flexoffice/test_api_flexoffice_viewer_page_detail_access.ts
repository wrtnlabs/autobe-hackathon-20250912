import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * This test scenario verifies the retrieval of detailed UI page information
 * in the FlexOffice system by a Viewer user.
 *
 * It authenticates both Admin and Viewer user roles. The Admin user creates
 * a new UI page theme, then creates a UI page associated with that theme.
 * The Viewer user retrieves the details of the created page using the
 * pageId via the viewer API endpoint.
 *
 * The test validates that the page returned for the viewer matches the
 * pageId requested, ensuring correct role-based access and no unauthorized
 * data exposure.
 *
 * The test also validates error cases: invalid pageId and unauthorized
 * access.
 *
 * All API responses use typia.assert for precise validation.
 */

export async function test_api_flexoffice_viewer_page_detail_access(
  connection: api.IConnection,
) {
  // 1. Admin signs up
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "AdminPass1234!";
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Admin logs in
  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Admin creates a theme
  const themeName = `TestTheme-${RandomGenerator.alphaNumeric(6)}`;
  const createdTheme: IFlexOfficeTheme =
    await api.functional.flexOffice.admin.themes.createTheme(connection, {
      body: {
        name: themeName,
        css: "body { background-color: #f0f0f0; }",
      } satisfies IFlexOfficeTheme.ICreate,
    });
  typia.assert(createdTheme);

  // 4. Admin creates a page associated with the theme
  const pageName = `TestPage-${RandomGenerator.alphaNumeric(6)}`;
  const pageStatus = "draft";
  const createdPage: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: {
        flex_office_page_theme_id: createdTheme.id,
        name: pageName,
        description: "This is a test page",
        status: pageStatus,
      } satisfies IFlexOfficePage.ICreate,
    });
  typia.assert(createdPage);

  // 5. Viewer signs up
  const viewerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const viewerPassword = "ViewerPass1234!";
  const viewerAuthorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: {
        name: "Viewer User",
        email: viewerEmail,
        password: viewerPassword,
      } satisfies IFlexOfficeViewer.ICreate,
    });
  typia.assert(viewerAuthorized);

  // 6. Viewer logs in
  const viewerLogin: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, {
      body: {
        email: viewerEmail,
        password: viewerPassword,
      } satisfies IFlexOfficeViewer.ILogin,
    });
  typia.assert(viewerLogin);

  // 7. Viewer retrieves the page detail by pageId
  const retrievedPage: IFlexOfficePage =
    await api.functional.flexOffice.viewer.pages.getPage(connection, {
      pageId: createdPage.id,
    });
  typia.assert(retrievedPage);

  TestValidator.equals(
    "page id matches requested id",
    retrievedPage.id,
    createdPage.id,
  );
  TestValidator.equals(
    "page theme id matches created theme id",
    retrievedPage.flex_office_page_theme_id,
    createdTheme.id,
  );
  TestValidator.predicate(
    "page name is string",
    typeof retrievedPage.name === "string",
  );
  TestValidator.predicate(
    "page status is string",
    typeof retrievedPage.status === "string",
  );

  // 8. Edge case: Attempt to get page with invalid pageId
  await TestValidator.error("invalid pageId should fail", async () => {
    await api.functional.flexOffice.viewer.pages.getPage(connection, {
      pageId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 9. Edge case: Attempt to get page with empty/all-zero pageId
  await TestValidator.error("empty pageId should fail", async () => {
    await api.functional.flexOffice.viewer.pages.getPage(connection, {
      pageId: "00000000-0000-0000-0000-000000000000",
    });
  });

  // 10. Edge case: Unauthenticated viewer connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.flexOffice.viewer.pages.getPage(
      unauthenticatedConnection,
      {
        pageId: createdPage.id,
      },
    );
  });
}
