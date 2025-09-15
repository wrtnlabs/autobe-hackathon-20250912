import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";

export async function test_api_page_comment_creation_admin_success(
  connection: api.IConnection,
) {
  // Step 1: Register admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "securePassword123";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a UI page
  const pageBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMax: 10 }),
    status: "draft",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    flex_office_page_theme_id: null,
  } satisfies IFlexOfficePage.ICreate;
  const page: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: pageBody,
    });
  typia.assert(page);

  // Step 3: Create a page comment by this admin
  const commentContent = RandomGenerator.paragraph({
    sentences: 2,
    wordMax: 15,
  });
  const commentBody = {
    page_id: page.id,
    editor_id: admin.id,
    content: commentContent,
  } satisfies IFlexOfficePageComment.ICreate;

  const comment: IFlexOfficePageComment =
    await api.functional.flexOffice.admin.pages.pageComments.create(
      connection,
      {
        pageId: page.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // Validate that the comment belongs to the created page and editor
  TestValidator.equals("pageId matches", comment.page_id, page.id);
  TestValidator.equals("editorId matches", comment.editor_id, admin.id);

  // Validate comment content
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );
}
