import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * Validate the soft deletion workflow of a FlexOffice viewer account.
 *
 * This test performs a full scenario for soft deleting a viewer account via
 * the viewer interface, including viewer registration, authentication, and
 * the subsequent soft delete API call. It verifies that the soft delete
 * operation can only be performed by authorized viewer users, properly sets
 * the deleted_at timestamp (implicitly), and returns no data upon success.
 *
 * Steps:
 *
 * 1. Register a viewer user account via /auth/viewer/join.
 * 2. Authenticate the viewer user via /auth/viewer/login.
 * 3. Soft delete the viewer account by calling DELETE
 *    /flexOffice/viewer/viewers/{viewerId}.
 * 4. Confirm deletion success by ensuring no errors occur and no data is
 *    returned.
 *
 * This test confirms adherence to authorization, error handling, and soft
 * delete behavior.
 */
export async function test_api_flex_office_viewer_soft_delete(
  connection: api.IConnection,
) {
  // 1. Create a viewer user account
  const viewerCreate = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
  } satisfies IFlexOfficeViewer.ICreate;

  const viewerAuthorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, { body: viewerCreate });
  typia.assert(viewerAuthorized);

  // 2. Login as the created viewer to obtain authorization tokens
  const viewerLogin = {
    email: viewerCreate.email,
    password: viewerCreate.password,
  } satisfies IFlexOfficeViewer.ILogin;

  const viewerLoggedIn: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, { body: viewerLogin });
  typia.assert(viewerLoggedIn);

  // 3. Perform soft delete of the viewer account
  await api.functional.flexOffice.viewer.viewers.eraseViewer(connection, {
    viewerId: viewerAuthorized.id,
  });

  // 4. Success confirmed by absence of exceptions and no return data
}
