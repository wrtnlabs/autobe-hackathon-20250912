import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";

/**
 * Tests retrieval of a page comment by an authenticated editor user.
 *
 * This E2E test performs the following:
 *
 * 1. Editor user registration and authentication.
 * 2. Creation of a FlexOffice UI page by the editor.
 * 3. Creation of a page comment on the UI page authored by the editor.
 * 4. Retrieval of the page comment by pageId and pageCommentId.
 *
 * Validates that the returned page comment matches the created comment,
 * ensuring correct ownership and data integrity.
 */
export async function test_api_page_comment_retrieval_editor_success(
  connection: api.IConnection,
) {
  // 1. Editor user registration and authentication
  const editorEmail: string = typia.random<string & tags.Format<"email">>();
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: RandomGenerator.name(),
        email: editorEmail,
        password: "validPassword123",
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  // 2. Create a FlexOffice UI page by the authenticated editor
  //    Note: Authorization token is handled automatically
  const pageCreateBody = {
    flex_office_page_theme_id: null,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "draft",
  } satisfies IFlexOfficePage.ICreate;
  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);

  // 3. Create a page comment on the created page by the editor
  const commentContent = RandomGenerator.paragraph({ sentences: 8 });
  const commentCreateBody = {
    page_id: page.id,
    editor_id: editor.id,
    content: commentContent,
  } satisfies IFlexOfficePageComment.ICreate;
  const comment: IFlexOfficePageComment =
    await api.functional.flexOffice.editor.pageComments.create(connection, {
      body: commentCreateBody,
    });
  typia.assert(comment);

  // 4. Retrieve the page comment using pageId and pageCommentId
  const retrievedComment: IFlexOfficePageComment =
    await api.functional.flexOffice.editor.pages.pageComments.at(connection, {
      pageId: page.id,
      pageCommentId: comment.id,
    });
  typia.assert(retrievedComment);

  // Validation: retrieved comment must match created comment
  TestValidator.equals(
    "retrieved comment id equals created comment id",
    retrievedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "retrieved comment page_id equals created page id",
    retrievedComment.page_id,
    page.id,
  );
  TestValidator.equals(
    "retrieved comment editor_id equals created editor id",
    retrievedComment.editor_id,
    editor.id,
  );
  TestValidator.equals(
    "retrieved comment content matches created content",
    retrievedComment.content,
    commentContent,
  );
}
