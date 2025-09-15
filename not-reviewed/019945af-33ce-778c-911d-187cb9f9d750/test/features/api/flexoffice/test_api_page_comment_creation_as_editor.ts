import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";

/**
 * End-to-end test for creating a page comment as an editor user.
 *
 * This test covers the entire business flow and validation checks.
 *
 * Steps:
 *
 * 1. Register a new editor user (join) with random valid credentials.
 * 2. Log in as the editor user (login) to obtain authenticated session.
 * 3. Generate a valid pageId UUID for which to create comments.
 * 4. Successfully create a page comment with valid content.
 * 5. Validate returned comment data and timestamps.
 * 6. Test error scenario: empty comment content should be rejected.
 * 7. Test error scenario: unauthorized comment creation without login.
 *
 * Uses typia.assert for runtime type validation of responses. Uses
 * TestValidator to check business rules and error handling.
 *
 * Ensures complete scenario coverage for editor page comment creation.
 */
export async function test_api_page_comment_creation_as_editor(
  connection: api.IConnection,
) {
  // 1. Register editor user
  const joinBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssword123",
  } satisfies IFlexOfficeEditor.ICreate;
  const joined: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: joinBody });
  typia.assert(joined);

  // 2. Login editor user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const logged: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, { body: loginBody });
  typia.assert(logged);

  // 3. Prepare valid pageId
  const pageId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create a valid comment
  const commentBody = {
    page_id: pageId,
    editor_id: joined.id,
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IFlexOfficePageComment.ICreate;
  const comment: IFlexOfficePageComment =
    await api.functional.flexOffice.editor.pages.pageComments.create(
      connection,
      { pageId, body: commentBody },
    );
  typia.assert(comment);

  TestValidator.equals("comment page_id matches", comment.page_id, pageId);
  TestValidator.equals(
    "comment editor_id matches",
    comment.editor_id,
    joined.id,
  );
  TestValidator.predicate(
    "comment content is non-empty",
    comment.content.length > 0,
  );
  TestValidator.predicate(
    "comment created_at is valid ISO date",
    !isNaN(Date.parse(comment.created_at)),
  );
  TestValidator.predicate(
    "comment updated_at is valid ISO date",
    !isNaN(Date.parse(comment.updated_at)),
  );

  // 5. Error case: empty content should fail
  await TestValidator.error("empty comment content is rejected", async () => {
    const invalidBody = {
      page_id: pageId,
      editor_id: joined.id,
      content: "",
    } satisfies IFlexOfficePageComment.ICreate;
    await api.functional.flexOffice.editor.pages.pageComments.create(
      connection,
      { pageId, body: invalidBody },
    );
  });

  // 6. Error case: unauthorized creation without authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized comment creation rejected",
    async () => {
      const validBody = {
        page_id: pageId,
        editor_id: joined.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IFlexOfficePageComment.ICreate;
      await api.functional.flexOffice.editor.pages.pageComments.create(
        unauthConnection,
        { pageId, body: validBody },
      );
    },
  );
}
