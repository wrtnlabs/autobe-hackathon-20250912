import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * End-to-End test for viewer retrieving a specific page comment in
 * FlexOffice.
 *
 * This test performs the following workflow:
 *
 * 1. Viewer role user registers and authenticates.
 * 2. Admin role user registers, authenticates, and creates a UI page.
 * 3. Editor role user registers, authenticates, and creates a comment on that
 *    page.
 * 4. Viewer user authenticates again and retrieves the created comment by
 *    pageId and pageCommentId.
 *
 * The test ensures proper role switching through login APIs and valid
 * session handling. It also validates the integrity of the retrieved
 * comment data matching the created one.
 *
 * This test simulates a real-world collaboration scenario with distinct
 * user roles, verifying cross-role data access and business rules
 * enforcement.
 */
export async function test_api_page_comment_retrieval_viewer_success(
  connection: api.IConnection,
) {
  // 1. Viewer user sign-up and authentication
  const viewerName = RandomGenerator.name();
  const viewerEmail = `${viewerName.replace(/ /g, ".").toLowerCase()}@example.com`;
  const viewerPassword = "TestPassword123!";
  const viewerAuthorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: {
        name: viewerName,
        email: viewerEmail,
        password: viewerPassword,
      } satisfies IFlexOfficeViewer.ICreate,
    });
  typia.assert(viewerAuthorized);

  // 2. Admin user sign-up and authentication
  const adminName = RandomGenerator.name();
  const adminEmail = `${adminName.replace(/ /g, ".").toLowerCase()}@example.com`;
  const adminPassword = "AdminPass123!";
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // Admin login to establish session for page creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IFlexOfficeAdmin.ILogin,
  });

  // 3. Admin creates a UI page
  const pageName = RandomGenerator.paragraph({ sentences: 3 });
  const pageDescription = RandomGenerator.paragraph({ sentences: 8 });
  const pageStatus = "published";
  const page: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: {
        name: pageName,
        description: pageDescription,
        status: pageStatus,
        flex_office_page_theme_id: null,
      } satisfies IFlexOfficePage.ICreate,
    });
  typia.assert(page);

  // 4. Editor user sign-up and authentication
  const editorName = RandomGenerator.name();
  const editorEmail = `${editorName.replace(/ /g, ".").toLowerCase()}@example.com`;
  const editorPassword = "EditorPass123!";
  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editorAuthorized);

  // Editor login to establish session for comment creation
  await api.functional.auth.editor.login(connection, {
    body: {
      email: editorEmail,
      password: editorPassword,
    } satisfies IFlexOfficeEditor.ILogin,
  });

  // 5. Editor creates a page comment
  const pageCommentContent = RandomGenerator.content({ paragraphs: 1 });
  const pageComment: IFlexOfficePageComment =
    await api.functional.flexOffice.editor.pageComments.create(connection, {
      body: {
        page_id: page.id,
        editor_id: editorAuthorized.id,
        content: pageCommentContent,
      } satisfies IFlexOfficePageComment.ICreate,
    });
  typia.assert(pageComment);

  // 6. Viewer logs in again to refresh session for comment retrieval
  await api.functional.auth.viewer.login(connection, {
    body: {
      email: viewerEmail,
      password: viewerPassword,
    } satisfies IFlexOfficeViewer.ILogin,
  });

  // 7. Viewer retrieves the created page comment
  const actualPageComment: IFlexOfficePageComment =
    await api.functional.flexOffice.viewer.pages.pageComments.at(connection, {
      pageId: page.id,
      pageCommentId: pageComment.id,
    });
  typia.assert(actualPageComment);

  // Validation of the retrieved comment data
  TestValidator.equals("page comment id", actualPageComment.id, pageComment.id);
  TestValidator.equals(
    "page comment page_id",
    actualPageComment.page_id,
    page.id,
  );
  TestValidator.equals(
    "page comment editor_id",
    actualPageComment.editor_id,
    editorAuthorized.id,
  );
  TestValidator.equals(
    "page comment content",
    actualPageComment.content,
    pageCommentContent,
  );
}
