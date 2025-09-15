import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePageComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComments";

/**
 * End-to-end test for admin updating a page comment.
 *
 * This test performs the following:
 *
 * 1. Creates a new admin user using /auth/admin/join and asserts authorized
 *    output.
 * 2. Logs in as the admin user and asserts authorized output.
 * 3. Uses randomized UUIDs for pageId and pageCommentId to simulate existing
 *    comment.
 * 4. Sends a PUT request with updated content and update timestamp to update the
 *    page comment.
 * 5. Validates the response matches IFlexOfficePageComments, including updated
 *    content.
 */
export async function test_api_page_comment_update_as_admin(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "pass1234";
  const joinedAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(joinedAdmin);

  // 2. Login as admin user
  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Prepare existing pageId and pageCommentId
  const pageId = typia.random<string & tags.Format<"uuid">>();
  const pageCommentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Update page comment with new content and updated_at timestamp
  const updatedContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedAt = new Date().toISOString();

  const updateBody = {
    content: updatedContent,
    updated_at: updatedAt,
  } satisfies IFlexOfficePageComments.IUpdate;

  const response: IFlexOfficePageComments =
    await api.functional.flexOffice.admin.pages.pageComments.updatePageComment(
      connection,
      {
        pageId,
        pageCommentId,
        body: updateBody,
      },
    );
  typia.assert(response);

  // 5. Validate response correctness
  TestValidator.equals(
    "updated comment content matches",
    response.content,
    updatedContent,
  );

  TestValidator.equals(
    "updated_at timestamp matches",
    response.updated_at,
    updatedAt,
  );

  TestValidator.equals("pageId matches", response.page_id, pageId);
  TestValidator.equals("pageCommentId matches", response.id, pageCommentId);

  // deleted_at is optional and not set here so no check for that
}
