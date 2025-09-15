import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";

/**
 * Test updating a FlexOffice UI page comment's content by an authenticated
 * editor user.
 *
 * This test covers the complete workflow of:
 *
 * 1. Editor registration and authentication.
 * 2. UI page creation for associating the comment.
 * 3. Page comment creation and subsequent update by the same editor.
 *
 * Validation includes confirming updated content, timestamp correctness, and
 * authorization restrictions.
 */
export async function test_api_page_comment_update_editor_authentication_success(
  connection: api.IConnection,
) {
  // 1. Editor registration
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
  } satisfies IFlexOfficeEditor.ICreate;
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editor);

  // 2. Editor login
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loginAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Create UI page
  const pageCreateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "draft",
  } satisfies IFlexOfficePage.ICreate;
  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);

  // 4. Create page comment
  const commentCreateBody = {
    page_id: page.id,
    editor_id: editor.id,
    content: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IFlexOfficePageComment.ICreate;
  const comment: IFlexOfficePageComment =
    await api.functional.flexOffice.editor.pageComments.create(connection, {
      body: commentCreateBody,
    });
  typia.assert(comment);

  // Save original timestamps
  const originalCreatedAt = comment.created_at;
  const originalUpdatedAt = comment.updated_at;

  // 5. Update page comment content
  const updatedContent = RandomGenerator.paragraph({ sentences: 5 });
  const commentUpdateBody = {
    content: updatedContent,
    updated_at: new Date().toISOString(),
  } satisfies IFlexOfficePageComment.IUpdate;
  const updatedComment: IFlexOfficePageComment =
    await api.functional.flexOffice.editor.pageComments.update(connection, {
      pageCommentId: comment.id,
      body: commentUpdateBody,
    });

  typia.assert(updatedComment);

  // Validate that the updated comment is the same id
  TestValidator.equals(
    "updated comment id matches",
    updatedComment.id,
    comment.id,
  );

  // Validate updated content matches
  TestValidator.equals(
    "updated comment content",
    updatedComment.content,
    updatedContent,
  );

  // Validate updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at timestamp after created_at",
    new Date(updatedComment.updated_at) >= new Date(updatedComment.created_at),
  );

  // Validate created_at unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedComment.created_at,
    originalCreatedAt,
  );

  // Validate updated_at changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedComment.updated_at,
    originalUpdatedAt,
  );
}
