import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";

export async function test_api_page_comment_retrieval_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@$$w0rd123";

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Admin user logs in to switch context
  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Admin creates a UI page
  const pageName = RandomGenerator.name();
  const pageDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const pageStatus = "draft";

  const createdPage: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: {
        name: pageName,
        description: pageDescription,
        status: pageStatus,
        flex_office_page_theme_id: null,
      } satisfies IFlexOfficePage.ICreate,
    });
  typia.assert(createdPage);

  // 4. Editor user joins
  const editorName = RandomGenerator.name();
  const editorEmail: string = typia.random<string & tags.Format<"email">>();
  const editorPassword = "P@$$w0rd123";

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editorAuthorized);

  // 5. Editor user logs in to switch context
  const editorLogin: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(editorLogin);

  // 6. Editor creates a page comment
  const commentContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 10,
    wordMax: 20,
  });

  const createdComment: IFlexOfficePageComment =
    await api.functional.flexOffice.editor.pageComments.create(connection, {
      body: {
        page_id: createdPage.id,
        editor_id: editorLogin.id,
        content: commentContent,
      } satisfies IFlexOfficePageComment.ICreate,
    });
  typia.assert(createdComment);

  // 7. Switch back to admin user login to regain context
  const adminRelogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminRelogin);

  // 8. Admin fetches the page comment
  const fetchedComment: IFlexOfficePageComment =
    await api.functional.flexOffice.admin.pages.pageComments.at(connection, {
      pageId: createdPage.id,
      pageCommentId: createdComment.id,
    });
  typia.assert(fetchedComment);

  // 9. Validate that the fetched comment matches the created comment
  TestValidator.equals(
    "page comment id matches",
    fetchedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "page id matches",
    fetchedComment.page_id,
    createdPage.id,
  );
  TestValidator.equals(
    "editor id matches",
    fetchedComment.editor_id,
    editorLogin.id,
  );
}
