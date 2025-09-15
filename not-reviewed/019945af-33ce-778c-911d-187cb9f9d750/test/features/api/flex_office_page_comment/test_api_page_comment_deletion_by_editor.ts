import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";

export async function test_api_page_comment_deletion_by_editor(
  connection: api.IConnection,
) {
  // 1. Register a new editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: `${RandomGenerator.name(1).replace(/ /g, "").toLowerCase()}@example.com`,
    password: "P@ssword1234",
  } satisfies IFlexOfficeEditor.ICreate;
  const joinedEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(joinedEditor);

  // 2. Log in as the registered editor user
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loggedInEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loggedInEditor);

  // 3. Create a new UI page
  const pageCreateBody = {
    flex_office_page_theme_id: null,
    name: `Page ${RandomGenerator.name(2)}`,
    description: null,
    status: "draft",
  } satisfies IFlexOfficePage.ICreate;
  const createdPage: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(createdPage);

  // 4. Create a page comment under the newly created page
  const commentCreateBody = {
    page_id: createdPage.id,
    editor_id: joinedEditor.id,
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IFlexOfficePageComment.ICreate;
  const createdComment: IFlexOfficePageComment =
    await api.functional.flexOffice.editor.pageComments.create(connection, {
      body: commentCreateBody,
    });
  typia.assert(createdComment);

  // 5. Delete the created page comment
  await api.functional.flexOffice.editor.pages.pageComments.erasePageComment(
    connection,
    {
      pageId: createdPage.id,
      pageCommentId: createdComment.id,
    },
  );
}
