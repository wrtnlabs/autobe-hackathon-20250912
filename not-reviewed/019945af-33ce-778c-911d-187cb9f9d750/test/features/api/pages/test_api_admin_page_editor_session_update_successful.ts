import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";

/**
 * This e2e test validates the successful update of a page editor session by an
 * authenticated admin user within the FlexOffice system.
 *
 * Business Workflow:
 *
 * 1. Admin user is created and authenticated.
 * 2. A UI page is created to associate editor sessions.
 * 3. A page editor session is created for the page.
 * 4. The page editor session is updated with changes.
 * 5. The response is validated to confirm the update's success.
 *
 * Edge cases and error scenarios are not implemented due to API limitations,
 * focusing instead on the successful update workflow.
 */
export async function test_api_admin_page_editor_session_update_successful(
  connection: api.IConnection,
) {
  // 1. Admin user is created and authenticated
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePass1234",
  } satisfies IFlexOfficeAdmin.ICreate;

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);

  // 2. Create a UI page
  const pageBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "draft",
  } satisfies IFlexOfficePage.ICreate;

  const page: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: pageBody,
    });
  typia.assert(page);

  // 3. Create a page editor session for the page
  // For editor_id, create a dummy UUID
  const editorId = typia.random<string & tags.Format<"uuid">>();

  const pageEditorCreateBody = {
    page_id: page.id,
    editor_id: editorId,
  } satisfies IFlexOfficePageEditor.ICreate;

  const pageEditor: IFlexOfficePageEditor =
    await api.functional.flexOffice.admin.pages.pageEditors.create(connection, {
      pageId: page.id,
      body: pageEditorCreateBody,
    });
  typia.assert(pageEditor);

  // 4. Update the page editor session
  const updateBody = {
    page_id: page.id,
    editor_id: editorId,
    deleted_at: null,
  } satisfies IFlexOfficePageEditor.IUpdate;

  const updatedPageEditor: IFlexOfficePageEditor =
    await api.functional.flexOffice.admin.pages.pageEditors.update(connection, {
      pageId: page.id,
      pageEditorId: pageEditor.id,
      body: updateBody,
    });
  typia.assert(updatedPageEditor);

  // 5. Validate that the update has reflected the correct data
  TestValidator.equals(
    "pageId matches updated",
    updatedPageEditor.page_id,
    page.id,
  );
  TestValidator.equals(
    "pageEditorId matches updated",
    updatedPageEditor.id,
    pageEditor.id,
  );
  TestValidator.equals(
    "editorId matches updated",
    updatedPageEditor.editor_id,
    editorId,
  );
  TestValidator.equals(
    "deleted_at is null",
    updatedPageEditor.deleted_at,
    null,
  );
}
