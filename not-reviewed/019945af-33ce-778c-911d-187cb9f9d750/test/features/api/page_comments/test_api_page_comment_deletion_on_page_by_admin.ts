import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * This test validates the ability of an administrator to delete a specific page
 * comment from a FlexOffice UI page. The test covers admin user registration,
 * authentication, deletion of the comment identified by valid UUIDs, and
 * verification that repeated deletion attempts fail indicating the comment is
 * effectively removed. This enforces the business rule that only admin users
 * may delete comments and that deletions are permanent.
 *
 * Test Process:
 *
 * 1. Register an admin user with valid email and password.
 * 2. Log in as the admin to authenticate and obtain JWT.
 * 3. Utilize randomly generated UUIDs representing the page and comment IDs.
 * 4. Issue a DELETE request to remove the specific page comment.
 * 5. Attempt deletion again to verify error response indicating non-existence.
 *
 * This test ensures correct authorization handling, datatype compliance, and
 * endpoint behavior for hard delete operations.
 */
export async function test_api_page_comment_deletion_on_page_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration with valid email and password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword123!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Admin user login to authenticate and get fresh token
  const loginResult: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loginResult);

  // Step 3: Generate valid UUIDs for page and comment to delete
  const pageId = typia.random<string & tags.Format<"uuid">>();
  const pageCommentId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Perform the hard delete operation for the page comment
  await api.functional.flexOffice.admin.pages.pageComments.erasePageComment(
    connection,
    {
      pageId,
      pageCommentId,
    },
  );

  // Step 5: Verify that repeated deletion of the same comment fails
  await TestValidator.error(
    "Repeated deletion of the same comment should fail",
    async () => {
      await api.functional.flexOffice.admin.pages.pageComments.erasePageComment(
        connection,
        {
          pageId,
          pageCommentId,
        },
      );
    },
  );
}
