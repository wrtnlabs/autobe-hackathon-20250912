import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePageComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComments";

/**
 * E2E test validating the update of a page comment by an editor user.
 *
 * Steps:
 *
 * 1. Editor user signs up and authenticates.
 * 2. Prepare mocked pageId and pageCommentId.
 * 3. Editor updates the comment with new content.
 * 4. Validate the updated response content and timestamps.
 * 5. Validate error handling on unauthorized and invalid update attempts.
 */
export async function test_api_page_comment_update_as_editor(
  connection: api.IConnection,
) {
  // Step 1: Editor user registers
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  } satisfies IFlexOfficeEditor.ICreate;

  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editor);

  // Step 2: Editor user logs in to obtain updated authorization
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const loggedInEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loggedInEditor);

  // Step 3: Prepare realistic pageId and existing comment pageCommentId
  const pageId = typia.random<string & tags.Format<"uuid">>();
  const pageCommentId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Compose update request body
  const updatedContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const nowIsoISOString = new Date().toISOString();

  const updateBody = {
    content: updatedContent,
    updated_at: nowIsoISOString,
    deleted_at: null,
  } satisfies IFlexOfficePageComments.IUpdate;

  // Step 5: Send update request
  const updatedComment =
    await api.functional.flexOffice.editor.pages.pageComments.updatePageComment(
      connection,
      {
        pageId,
        pageCommentId,
        body: updateBody,
      },
    );
  typia.assert(updatedComment);

  // Validate updated fields in response
  TestValidator.equals(
    "updated content",
    updatedComment.content,
    updateBody.content,
  );
  TestValidator.equals(
    "updated updated_at",
    updatedComment.updated_at,
    updateBody.updated_at,
  );
  TestValidator.equals("deleted_at is null", updatedComment.deleted_at, null);

  // Test error when updating without proper authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.flexOffice.editor.pages.pageComments.updatePageComment(
      unauthConn,
      {
        pageId,
        pageCommentId,
        body: updateBody,
      },
    );
  });

  // Test error when updating with invalid update data (empty content)
  const invalidUpdateBody = {
    content: "",
    updated_at: nowIsoISOString,
    deleted_at: null,
  } satisfies IFlexOfficePageComments.IUpdate;

  await TestValidator.error(
    "update with empty content should fail",
    async () => {
      await api.functional.flexOffice.editor.pages.pageComments.updatePageComment(
        connection,
        {
          pageId,
          pageCommentId,
          body: invalidUpdateBody,
        },
      );
    },
  );
}
