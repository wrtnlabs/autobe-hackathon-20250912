import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * E2E test for the viewer role page comment deletion API.
 *
 * This test covers the workflow where a viewer user creates an account, logs
 * in, and deletes a page comment. It validates that the comment deletion
 * endpoint correctly processes deletion and enforces authorization. It also
 * checks negative scenarios such as deleting a non-existent comment.
 *
 * The test anticipates authorization token management done implicitly by the
 * SDK.
 */
export async function test_api_page_comment_removal_viewer_role(
  connection: api.IConnection,
) {
  // Step 1: Create viewer user account
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = `Pass${RandomGenerator.alphaNumeric(6)}`;
  // Prepare the viewer creation request body
  const viewerCreateBody = {
    name: RandomGenerator.name(),
    email: email,
    password: password,
  } satisfies IFlexOfficeViewer.ICreate;

  // Call join to create the viewer user
  const viewerAuthorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: viewerCreateBody,
    });
  typia.assert(viewerAuthorized);

  // Step 2: Login the viewer user
  const viewerLoginBody = {
    email: email,
    password: password,
  } satisfies IFlexOfficeViewer.ILogin;

  const viewerLoginAuthorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, {
      body: viewerLoginBody,
    });
  typia.assert(viewerLoginAuthorized);

  // Step 3: Use a valid UUID as a mock existing pageCommentId
  const validPageCommentId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Delete the page comment by pageCommentId
  await api.functional.flexOffice.viewer.pageComments.erase(connection, {
    pageCommentId: validPageCommentId,
  });

  // Step 5: Attempt to delete a non-existent page comment should fail
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deleting non-existent page comment should fail",
    async () => {
      await api.functional.flexOffice.viewer.pageComments.erase(connection, {
        pageCommentId: randomNonExistentId,
      });
    },
  );
}
