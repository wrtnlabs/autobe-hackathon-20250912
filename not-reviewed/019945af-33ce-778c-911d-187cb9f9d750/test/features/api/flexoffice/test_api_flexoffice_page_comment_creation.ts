import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * Comprehensive end-to-end test validating the creation of a FlexOffice
 * page comment by an authorized editor.
 *
 * This test goes through the entire workflow of:
 *
 * 1. Registering and authenticating an editor user
 * 2. Registering and authenticating a viewer user (multi-role context)
 * 3. Verifying the existence of a FlexOffice UI page
 * 4. Creating a comment on a page by the authenticated editor
 * 5. Validating the result matches expectations
 * 6. Testing error scenarios for invalid page IDs, editor IDs, missing
 *    content, and unauthorized attempts
 *
 * This ensures proper authorization, data validation, and error handling
 * for the page comment creation.
 *
 * @param connection API connection context
 */
export async function test_api_flexoffice_page_comment_creation(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate editor user
  const editorName = RandomGenerator.name();
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "Password123!";
  // Editor Join
  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editorAuthorized);

  // Step 2: Authenticate editor user
  const editorLoggedIn: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(editorLoggedIn);

  // Step 3: Register and authenticate viewer user (multi-role context)
  const viewerName = RandomGenerator.name();
  const viewerEmail = typia.random<string & tags.Format<"email">>();
  const viewerPassword = "Password123!";
  // Viewer Join
  const viewerAuthorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: {
        name: viewerName,
        email: viewerEmail,
        password: viewerPassword,
      } satisfies IFlexOfficeViewer.ICreate,
    });
  typia.assert(viewerAuthorized);

  // Viewer Login
  const viewerLoggedIn: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, {
      body: {
        email: viewerEmail,
        password: viewerPassword,
      } satisfies IFlexOfficeViewer.ILogin,
    });
  typia.assert(viewerLoggedIn);

  // Step 4: Verify existence of FlexOffice UI page
  const pageId = typia.random<string & tags.Format<"uuid">>();

  const page: IFlexOfficePage =
    await api.functional.flexOffice.viewer.pages.getPage(connection, {
      pageId,
    });
  typia.assert(page);
  TestValidator.equals("pageId matches requested", page.id, pageId);

  // Step 5: Create a comment on the page
  const commentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const pageComment: IFlexOfficePageComment =
    await api.functional.flexOffice.editor.pageComments.create(connection, {
      body: {
        page_id: pageId,
        editor_id: editorAuthorized.id,
        content: commentContent,
      } satisfies IFlexOfficePageComment.ICreate,
    });
  typia.assert(pageComment);

  TestValidator.equals("comment page_id matches", pageComment.page_id, pageId);
  TestValidator.equals(
    "comment editor_id matches",
    pageComment.editor_id,
    editorAuthorized.id,
  );
  TestValidator.equals(
    "comment content matches",
    pageComment.content,
    commentContent,
  );

  // Step 6: Test failure cases
  await TestValidator.error("invalid page_id should fail", async () => {
    await api.functional.flexOffice.editor.pageComments.create(connection, {
      body: {
        page_id: typia.random<string & tags.Format<"uuid">>(),
        editor_id: editorAuthorized.id,
        content: commentContent,
      } satisfies IFlexOfficePageComment.ICreate,
    });
  });

  await TestValidator.error("invalid editor_id should fail", async () => {
    await api.functional.flexOffice.editor.pageComments.create(connection, {
      body: {
        page_id: pageId,
        editor_id: typia.random<string & tags.Format<"uuid">>(),
        content: commentContent,
      } satisfies IFlexOfficePageComment.ICreate,
    });
  });

  await TestValidator.error("empty content should fail", async () => {
    await api.functional.flexOffice.editor.pageComments.create(connection, {
      body: {
        page_id: pageId,
        editor_id: editorAuthorized.id,
        content: "",
      } satisfies IFlexOfficePageComment.ICreate,
    });
  });

  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized comment creation should fail",
    async () => {
      await api.functional.flexOffice.editor.pageComments.create(
        unauthenticatedConnection,
        {
          body: {
            page_id: pageId,
            editor_id: editorAuthorized.id,
            content: commentContent,
          } satisfies IFlexOfficePageComment.ICreate,
        },
      );
    },
  );
}
