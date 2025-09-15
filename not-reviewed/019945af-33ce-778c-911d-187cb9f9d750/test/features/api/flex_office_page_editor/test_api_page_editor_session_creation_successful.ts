import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";

export async function test_api_page_editor_session_creation_successful(
  connection: api.IConnection,
) {
  // 1. Create and authenticate editor user
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: RandomGenerator.name(),
        email: `${RandomGenerator.name(1)}@example.com`,
        password: "password123",
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  // 2. Create UI page
  const pageCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
    status: "draft",
  } satisfies IFlexOfficePage.ICreate;

  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);

  // 3. Create page editor session
  const sessionCreateBody = {
    page_id: page.id,
    editor_id: editor.id,
  } satisfies IFlexOfficePageEditor.ICreate;

  const pageEditorSession: IFlexOfficePageEditor =
    await api.functional.flexOffice.editor.pages.pageEditors.create(
      connection,
      {
        pageId: page.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(pageEditorSession);

  // 4. Validate returned session data
  TestValidator.equals("Page ID matches", pageEditorSession.page_id, page.id);
  TestValidator.equals(
    "Editor ID matches",
    pageEditorSession.editor_id,
    editor.id,
  );
  TestValidator.predicate(
    "Session ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      pageEditorSession.id,
    ),
  );
  TestValidator.predicate(
    "Session created_at is ISO 8601",
    typeof pageEditorSession.created_at === "string" &&
      !isNaN(Date.parse(pageEditorSession.created_at)),
  );
  TestValidator.predicate(
    "Session updated_at is ISO 8601",
    typeof pageEditorSession.updated_at === "string" &&
      !isNaN(Date.parse(pageEditorSession.updated_at)),
  );
  TestValidator.equals(
    "Session deleted_at is null or undefined",
    pageEditorSession.deleted_at ?? null,
    null,
  );
}
