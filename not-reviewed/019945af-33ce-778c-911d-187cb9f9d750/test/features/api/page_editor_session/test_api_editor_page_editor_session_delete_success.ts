import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";

export async function test_api_editor_page_editor_session_delete_success(
  connection: api.IConnection,
) {
  // 1. Editor joins and registers
  const editorCreate = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;
  const editorAuthorized = await api.functional.auth.editor.join(connection, {
    body: editorCreate,
  });
  typia.assert(editorAuthorized);

  // 2. Editor login with credentials
  const editorLoginPayload = {
    email: editorCreate.email,
    password: editorCreate.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loginAuthorized = await api.functional.auth.editor.login(connection, {
    body: editorLoginPayload,
  });
  typia.assert(loginAuthorized);

  // 3. Create a UI page
  const pageCreatePayload = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "draft",
    flex_office_page_theme_id: null,
  } satisfies IFlexOfficePage.ICreate;
  const createdPage = await api.functional.flexOffice.editor.pages.create(
    connection,
    {
      body: pageCreatePayload,
    },
  );
  typia.assert(createdPage);

  // 4. Create a page editor session
  const pageEditorCreatePayload = {
    page_id: createdPage.id,
    editor_id: editorAuthorized.id,
  } satisfies IFlexOfficePageEditor.ICreate;
  const createdPageEditor =
    await api.functional.flexOffice.editor.pageEditors.create(connection, {
      body: pageEditorCreatePayload,
    });
  typia.assert(createdPageEditor);

  // 5. Delete the page editor session
  await api.functional.flexOffice.editor.pageEditors.erase(connection, {
    pageEditorId: createdPageEditor.id,
  });
}
