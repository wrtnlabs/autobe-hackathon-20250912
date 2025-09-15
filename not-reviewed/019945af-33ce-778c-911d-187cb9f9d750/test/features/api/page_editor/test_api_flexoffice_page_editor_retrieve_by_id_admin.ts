import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";

/**
 * This E2E test verifies the retrieval of a page editor session by its
 * unique identifier in the FlexOffice system as an admin user. The test
 * includes admin user registration, login, then retrieval of a page editor
 * session by ID. It validates success responses, exact property matching,
 * and error scenarios for unauthorized access and non-existent IDs.
 *
 * Steps:
 *
 * 1. Register an admin user with unique email and password.
 * 2. Log in as the admin to acquire authorization tokens.
 * 3. Retrieve a page editor session by a given pageEditorId.
 * 4. Confirm the response fields and values.
 * 5. Assert error responses when using a non-existent pageEditorId.
 * 6. Assert error when attempting retrieval without authentication.
 */
export async function test_api_flexoffice_page_editor_retrieve_by_id_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "admin1234",
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminCreated: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminCreated);

  // 2. Admin login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Retrieve a valid page editor session by its ID
  const pageEditor = await api.functional.flexOffice.admin.pageEditors.at(
    connection,
    {
      pageEditorId: adminLogin.id,
    },
  );
  typia.assert(pageEditor);

  TestValidator.equals(
    "Returned page editor session has the requested id",
    pageEditor.id,
    adminLogin.id,
  );

  TestValidator.predicate(
    "pageEditor has non-empty page_id",
    typeof pageEditor.page_id === "string" && pageEditor.page_id.length > 0,
  );

  TestValidator.predicate(
    "pageEditor has non-empty editor_id",
    typeof pageEditor.editor_id === "string" && pageEditor.editor_id.length > 0,
  );

  TestValidator.predicate(
    "pageEditor has valid created_at date string",
    typeof pageEditor.created_at === "string" &&
      !isNaN(Date.parse(pageEditor.created_at)),
  );

  TestValidator.predicate(
    "pageEditor has valid updated_at date string",
    typeof pageEditor.updated_at === "string" &&
      !isNaN(Date.parse(pageEditor.updated_at)),
  );

  if (pageEditor.deleted_at !== null && pageEditor.deleted_at !== undefined) {
    TestValidator.predicate(
      "pageEditor deleted_at is null or valid date string",
      pageEditor.deleted_at === null ||
        (typeof pageEditor.deleted_at === "string" &&
          !isNaN(Date.parse(pageEditor.deleted_at))),
    );
  }

  // 4. Attempt retrieval with non-existent ID to simulate 404 error
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "Error thrown when retrieving with non-existent pageEditorId",
    async () => {
      await api.functional.flexOffice.admin.pageEditors.at(connection, {
        pageEditorId: nonExistentId,
      });
    },
  );

  // 5. Attempt retrieval with unauthenticated connection to simulate 401 error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Error thrown when retrieving pageEditor without authentication",
    async () => {
      await api.functional.flexOffice.admin.pageEditors.at(unauthConn, {
        pageEditorId: pageEditor.id,
      });
    },
  );
}
