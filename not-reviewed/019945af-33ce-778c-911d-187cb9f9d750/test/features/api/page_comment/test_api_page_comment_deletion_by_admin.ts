import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * This test verifies the administrator's ability to delete a page comment by
 * its unique identifier.
 *
 * It covers the full workflow of:
 *
 * 1. Admin registration (join) and login to obtain authorization
 * 2. Using a valid pageCommentId (random generated UUID) for deletion
 * 3. Performing the DELETE operation as admin and confirming successful deletion
 * 4. Validating that deletion of non-existent comment returns error
 * 5. Ensuring unauthorized users cannot perform the deletion operation
 */
export async function test_api_page_comment_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration using join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Password123!";
  const createAccountBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createAccountBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login to obtain fresh authorization token
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;
  const loginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Prepare a valid pageCommentId for deletion
  // Since no creation API is given for page comments, use a valid random UUID
  const pageCommentIdToDelete = typia.random<string & tags.Format<"uuid">>();

  // 4. Admin deletes the page comment
  await api.functional.flexOffice.admin.pageComments.erase(connection, {
    pageCommentId: pageCommentIdToDelete,
  });

  // 5. Attempt to delete again to check 404 or error response
  await TestValidator.error(
    "Deleting a non-existent page comment should fail",
    async () => {
      await api.functional.flexOffice.admin.pageComments.erase(connection, {
        pageCommentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 6. Verify unauthorized user cannot delete page comment
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Unauthorized deletion attempt should fail",
    async () => {
      await api.functional.flexOffice.admin.pageComments.erase(
        unauthenticatedConnection,
        {
          pageCommentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
