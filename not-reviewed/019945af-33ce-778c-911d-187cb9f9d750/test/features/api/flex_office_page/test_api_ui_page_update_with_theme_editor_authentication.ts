import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";

/**
 * Test updating a UI page via the editor interface with complete
 * authentication.
 *
 * Business context: Editor users can authenticate, create themes, create
 * pages with themes, update those pages including theme changes, and
 * retrieve pages reflecting updated data. This test covers all steps
 * ensuring proper authentication, page theme creation, page creation, page
 * update, and final validation that changes persisted.
 *
 * Test steps:
 *
 * 1. Editor user registration and authentication via /auth/editor/join.
 * 2. Create an initial UI page theme using POST /flexOffice/editor/pageThemes.
 * 3. Create a UI page with the created theme using POST
 *    /flexOffice/editor/pages.
 * 4. Create a second UI page theme.
 * 5. Update the UI page with PUT /flexOffice/editor/pages/{pageId} to change
 *    name, description, status, and set the theme to the second theme.
 * 6. Verify the updated fields including theme ID, name, description, and
 *    status.
 *
 * Ensures JWT tokens are received and authorization succeeds. Does not
 * cover error scenarios or permission denials.
 */
export async function test_api_ui_page_update_with_theme_editor_authentication(
  connection: api.IConnection,
) {
  // 1. Editor user registration and authentication
  const editorCreate: IFlexOfficeEditor.ICreate = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
  };
  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: editorCreate });
  typia.assert(editorAuthorized);

  // 2. Create first UI page theme
  const pageThemeCreate1: IFlexOfficePageTheme.ICreate = {
    name: `theme1-${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  };
  const pageTheme1: IFlexOfficePageTheme =
    await api.functional.flexOffice.editor.pageThemes.create(connection, {
      body: pageThemeCreate1,
    });
  typia.assert(pageTheme1);

  // 3. Create UI page with first theme
  const pageCreate: IFlexOfficePage.ICreate = {
    flex_office_page_theme_id: pageTheme1.id,
    name: `Page ${RandomGenerator.paragraph({ sentences: 2 })}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "draft",
  };
  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreate,
    });
  typia.assert(page);
  TestValidator.equals(
    "created page theme ID equals first theme ID",
    page.flex_office_page_theme_id,
    pageTheme1.id,
  );
  TestValidator.equals(
    "created page name equals request name",
    page.name,
    pageCreate.name,
  );
  TestValidator.equals(
    "created page description equals request description",
    page.description ?? null,
    pageCreate.description ?? null,
  );
  TestValidator.equals(
    "created page status equals request status",
    page.status,
    pageCreate.status,
  );

  // 4. Create second UI page theme
  const pageThemeCreate2: IFlexOfficePageTheme.ICreate = {
    name: `theme2-${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  };
  const pageTheme2: IFlexOfficePageTheme =
    await api.functional.flexOffice.editor.pageThemes.create(connection, {
      body: pageThemeCreate2,
    });
  typia.assert(pageTheme2);

  // 5. Update the previously created page with new values and second theme
  const pageUpdate: IFlexOfficePage.IUpdate = {
    flex_office_page_theme_id: pageTheme2.id,
    name: `Updated ${RandomGenerator.paragraph({ sentences: 3 })}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "published",
  };
  const updatedPage: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.update(connection, {
      pageId: page.id,
      body: pageUpdate,
    });
  typia.assert(updatedPage);

  // 6. Verify updated fields
  TestValidator.equals(
    "updated page theme ID equals second theme ID",
    updatedPage.flex_office_page_theme_id,
    pageTheme2.id,
  );
  TestValidator.equals(
    "updated page name equals update name",
    updatedPage.name,
    pageUpdate.name,
  );
  TestValidator.equals(
    "updated page description equals update description",
    updatedPage.description ?? null,
    pageUpdate.description ?? null,
  );
  TestValidator.equals(
    "updated page status equals update status",
    updatedPage.status,
    pageUpdate.status,
  );
}
