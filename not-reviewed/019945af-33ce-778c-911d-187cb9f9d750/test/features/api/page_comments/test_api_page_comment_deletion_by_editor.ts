import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * End-to-end test for FlexOffice page comment deletion by an authorized editor.
 *
 * This test validates that an editor user can successfully delete a FlexOffice
 * page comment by its UUID identifier and that subsequent deletion attempts
 * fail as expected.
 *
 * Steps:
 *
 * 1. Register a new editor user and authenticate to obtain tokens.
 * 2. Simulate existing page comment by generating a UUID.
 * 3. Perform a DELETE request to delete the page comment by ID.
 * 4. Validate successful deletion (no content response).
 * 5. Attempt to delete the same comment again, expecting an error (404 not found).
 */
export async function test_api_page_comment_deletion_by_editor(
  connection: api.IConnection,
) {
  // Step 1. Register and authenticate an editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorAuthorized);

  // Step 2. Use a valid UUID to simulate an existing pageCommentId
  const pageCommentId = typia.random<string & tags.Format<"uuid">>();

  // Step 3. Delete the page comment by ID
  await api.functional.flexOffice.editor.pageComments.erase(connection, {
    pageCommentId,
  });

  // Step 4. Deletion successful; no content returned, no further validation needed

  // Step 5. Attempt to delete again, expect error due to non-existent comment
  await TestValidator.error(
    "deleting non-existent comment should fail",
    async () => {
      await api.functional.flexOffice.editor.pageComments.erase(connection, {
        pageCommentId,
      });
    },
  );
}
