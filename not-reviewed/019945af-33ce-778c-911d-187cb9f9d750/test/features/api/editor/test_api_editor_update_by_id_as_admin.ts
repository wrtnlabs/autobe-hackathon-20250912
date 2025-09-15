import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * E2E Test to validate the update of editor details by admin users.
 *
 * This test performs the following steps:
 *
 * 1. Admin user creation by join API with valid email and password.
 * 2. Admin login to obtain authentication credentials.
 * 3. Generate update payload for editor with valid fields including possible
 *    null values.
 * 4. Call the update editor API with valid editorId and update data.
 * 5. Validate successful update with typia.assert.
 * 6. Verify error on invalid editorId (simulate 404).
 * 7. Check unauthorized update attempt fails.
 *
 * This ensures only admins can update editors and handles error response
 * correctly.
 */
export async function test_api_editor_update_by_id_as_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin join to create a new administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "strongpassword123";
  const adminAccount: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminAccount);

  // Step 2: Admin login to authenticate
  const loginAccount: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loginAccount);

  // Construct a valid editor update payload with some nullable fields explicitly set
  const editorUpdatePayload: IFlexOfficeEditor.IUpdate = {
    email: `updated_${typia.random<string & tags.Format<"email">>()}`,
    name: RandomGenerator.name(2),
    password_hash: RandomGenerator.alphaNumeric(64),
    deleted_at: null, // Explicit null means active editor
  };

  // Step 3: Use a new random UUID for editorId
  const validEditorId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Call updateEditor API with valid editorId and payload
  const updatedEditor: IFlexOfficeEditor =
    await api.functional.flexOffice.admin.editors.updateEditor(connection, {
      editorId: validEditorId,
      body: editorUpdatePayload,
    });
  typia.assert(updatedEditor);

  // Step 5: Verify key data updated matches the payload
  TestValidator.equals(
    "Editor name matches updated name",
    updatedEditor.name,
    editorUpdatePayload.name,
  );
  TestValidator.equals(
    "Editor email matches updated email",
    updatedEditor.email,
    editorUpdatePayload.email,
  );

  // Step 6: Test error for invalid editorId (invalid UUID to simulate 404)
  await TestValidator.error(
    "should fail update on invalid editorId",
    async () => {
      await api.functional.flexOffice.admin.editors.updateEditor(connection, {
        editorId: "invalid-editor-uuid",
        body: editorUpdatePayload,
      });
    },
  );

  // Step 7: Test unauthorized update failure with no admin auth
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized update attempt must fail",
    async () => {
      await api.functional.flexOffice.admin.editors.updateEditor(
        unauthConnection,
        {
          editorId: validEditorId,
          body: editorUpdatePayload,
        },
      );
    },
  );
}
