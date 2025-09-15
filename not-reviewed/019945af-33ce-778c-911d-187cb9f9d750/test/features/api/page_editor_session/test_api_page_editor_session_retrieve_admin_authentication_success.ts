import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";

export async function test_api_page_editor_session_retrieve_admin_authentication_success(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = "Password123!";

  const adminCreated: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminCreated);

  // 2. Login as admin
  const adminLoggedIn: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // 3. Create a UI page with admin's authorization
  const pageName = RandomGenerator.name(2);
  const pageDescription = RandomGenerator.paragraph({ sentences: 3 });
  const pageStatus = "draft";

  const createdPage: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: {
        flex_office_page_theme_id: null,
        name: pageName,
        description: pageDescription,
        status: pageStatus,
      } satisfies IFlexOfficePage.ICreate,
    });
  typia.assert(createdPage);

  // 4. Register editor user
  const editorName = RandomGenerator.name(2);
  const editorEmail = `editor_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const editorPassword = "EditorPwd123!";

  const editorCreated: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editorCreated);

  // 5. Login as editor
  const editorLoggedIn: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(editorLoggedIn);

  // 6. Create page editor session associating editor with page
  const pageEditorCreated: IFlexOfficePageEditor =
    await api.functional.flexOffice.editor.pageEditors.create(connection, {
      body: {
        editor_id: editorCreated.id,
        page_id: createdPage.id,
      } satisfies IFlexOfficePageEditor.ICreate,
    });
  typia.assert(pageEditorCreated);

  // 7. Retrieve the session by admin
  const sessionRetrieved: IFlexOfficePageEditor =
    await api.functional.flexOffice.admin.pages.pageEditors.at(connection, {
      pageId: createdPage.id,
      pageEditorId: pageEditorCreated.id,
    });
  typia.assert(sessionRetrieved);

  // 8. Validate fields
  TestValidator.equals(
    "pageEditorId matches",
    sessionRetrieved.id,
    pageEditorCreated.id,
  );
  TestValidator.equals(
    "pageId matches",
    sessionRetrieved.page_id,
    createdPage.id,
  );
  TestValidator.equals(
    "editorId matches",
    sessionRetrieved.editor_id,
    editorCreated.id,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof sessionRetrieved.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(
        sessionRetrieved.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof sessionRetrieved.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(
        sessionRetrieved.updated_at,
      ),
  );
  if (
    sessionRetrieved.deleted_at !== null &&
    sessionRetrieved.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at ISO 8601 string if present",
      typeof sessionRetrieved.deleted_at === "string" &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(
          sessionRetrieved.deleted_at,
        ),
    );
  } else {
    TestValidator.equals(
      "deleted_at null or undefined",
      sessionRetrieved.deleted_at,
      null,
    );
  }
}
