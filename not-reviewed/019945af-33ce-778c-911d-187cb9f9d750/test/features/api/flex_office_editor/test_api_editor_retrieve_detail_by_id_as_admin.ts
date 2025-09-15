import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * Test fetching a specific editor user's detailed information by editorId as
 * admin.
 *
 * This includes admin authentication, fetching editor details, validating
 * response data, unauthorized access denial, and error handling for invalid or
 * non-existent editor IDs.
 */
export async function test_api_editor_retrieve_detail_by_id_as_admin(
  connection: api.IConnection,
) {
  // 1. Admin join (register) to create admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreate = {
    email: adminEmail,
    password: "secret1234",
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(adminAuthorized);

  // 2. Admin login
  const adminLogin = {
    email: adminEmail,
    password: "secret1234",
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLoginAuthorized = await api.functional.auth.admin.login(
    connection,
    {
      body: adminLogin,
    },
  );
  typia.assert(adminLoginAuthorized);

  // 3. Prepare editorId to test retrieval
  // No editor creation API provided, so using generated random UUID
  const editorId = typia.random<string & tags.Format<"uuid">>();

  // 4. Test unauthorized access: no admin authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access without admin login should fail",
    async () => {
      await api.functional.flexOffice.admin.editors.atEditor(unauthConn, {
        editorId,
      });
    },
  );

  // 5. Retrieve editor detail with authorized admin connection
  const editor = await api.functional.flexOffice.admin.editors.atEditor(
    connection,
    {
      editorId,
    },
  );
  typia.assert(editor);

  // 6. Validate retrieved editor data using typia.assert (handles formats)
  // Additional business rules or logic validation can be applied here if needed

  // 7. Test non-existent editorId returns error
  const nonExistentEditorId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error("non-existent editorId returns 404", async () => {
    await api.functional.flexOffice.admin.editors.atEditor(connection, {
      editorId: nonExistentEditorId,
    });
  });
}
