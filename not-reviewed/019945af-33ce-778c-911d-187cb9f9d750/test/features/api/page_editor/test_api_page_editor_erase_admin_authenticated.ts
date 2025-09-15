import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * This test validates the deletion of a page editor session identified by
 * pageEditorId for an admin user. It covers the full admin authentication
 * process, including user creation and login, followed by deletion invocation.
 * Negative tests include unauthorized access, invalid UUID formats, and
 * non-existent IDs.
 */
export async function test_api_page_editor_erase_admin_authenticated(
  connection: api.IConnection,
) {
  // 1. Create a new admin user via /auth/admin/join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Authenticate the admin user via /auth/admin/login
  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. -- Dependencies: Assume a pageId and pageEditorId exist for testing --
  // Since no API to create a page or pageEditor is provided, generate compatible UUIDs
  const pageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const pageEditorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Execute delete operation on page editor session
  await api.functional.flexOffice.admin.pages.pageEditors.erase(connection, {
    pageId: pageId,
    pageEditorId: pageEditorId,
  });

  // 5. Negative tests:
  // 5.1. Unauthorized access: simulate with unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.flexOffice.admin.pages.pageEditors.erase(
        unauthenticatedConnection,
        {
          pageId: pageId,
          pageEditorId: pageEditorId,
        },
      );
    },
  );

  // 5.2. Invalid UUID format for pageId - pass plain invalid string to trigger runtime error
  await TestValidator.error(
    "invalid pageId UUID format should fail",
    async () => {
      await api.functional.flexOffice.admin.pages.pageEditors.erase(
        connection,
        {
          pageId: "invalid-uuid-format",
          pageEditorId: pageEditorId,
        },
      );
    },
  );

  // 5.3. Invalid UUID format for pageEditorId - pass plain invalid string to trigger runtime error
  await TestValidator.error(
    "invalid pageEditorId UUID format should fail",
    async () => {
      await api.functional.flexOffice.admin.pages.pageEditors.erase(
        connection,
        {
          pageId: pageId,
          pageEditorId: "invalid-uuid-format",
        },
      );
    },
  );

  // 5.4. Non-existent IDs: generate random UUIDs not expected to exist
  const nonExistentPageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const nonExistentPageEditorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deletion with non-existent pageId and pageEditorId should fail",
    async () => {
      await api.functional.flexOffice.admin.pages.pageEditors.erase(
        connection,
        {
          pageId: nonExistentPageId,
          pageEditorId: nonExistentPageEditorId,
        },
      );
    },
  );

  // 6. Additional concurrency conflict tests are skipped due to no API support
}
