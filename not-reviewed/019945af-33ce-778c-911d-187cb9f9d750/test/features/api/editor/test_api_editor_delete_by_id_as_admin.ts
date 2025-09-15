import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * Test deleting an editor user by editorId as an admin.
 *
 * This test covers the full workflow of an admin user joining the system,
 * logging in, and deleting a FlexOffice editor identified by editorId. It
 * asserts correct authorization, successful deletion, and rejects
 * unauthorized deletion attempts.
 *
 * Steps:
 *
 * 1. Admin user creation (join)
 * 2. Admin user login
 * 3. Deletion of editor by editorId using admin authorization
 * 4. Attempt deletion without authorization and expect failure
 */
export async function test_api_editor_delete_by_id_as_admin(
  connection: api.IConnection,
) {
  // 1. Admin signs up
  const adminCreateBody = {
    email: `admin.${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "admin-password",
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorize: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorize);

  // 2. Admin logs in
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loginAuthorize: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loginAuthorize);

  // 3. Perform deletion with authenticated admin
  const editorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await api.functional.flexOffice.admin.editors.eraseEditor(connection, {
    editorId,
  });

  // 4. Unauthorized deletion attempt
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized user cannot delete editor",
    async () => {
      await api.functional.flexOffice.admin.editors.eraseEditor(
        unauthorizedConnection,
        {
          editorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
