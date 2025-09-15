import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * Test function to validate the deletion of custom scripts by authenticated
 * editor users.
 *
 * This function performs the following steps:
 *
 * 1. Authenticate as a new editor user.
 * 2. Generate a new valid UUID to simulate creation of a custom script ID.
 * 3. Simulate deletion of a custom script using the obtained editor credentials.
 * 4. Verify the API call for deletion succeeds without returning content.
 * 5. Attempt to delete script without authentication and validate failure.
 * 6. Attempt to delete a non-existent script and expect rejection.
 */
export async function test_api_custom_script_deletion_by_editor(
  connection: api.IConnection,
) {
  // 1. Authenticate as an editor user
  const editorUser: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: RandomGenerator.name(),
        email: `${RandomGenerator.name(1)}@example.com`,
        password: "securePassword123!",
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editorUser);

  // 2. Generate a UUID to use as a script ID for deletion test
  const validScriptId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Delete the script with authentication
  await api.functional.flexOffice.editor.customScripts.erase(connection, {
    id: validScriptId,
  });

  // 4. Confirm deletion was successful (no response body means success)

  // 5. Attempt to delete a script without authorization
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized deletion attempt should be rejected",
    async () => {
      await api.functional.flexOffice.editor.customScripts.erase(
        unauthenticatedConnection,
        {
          id: validScriptId,
        },
      );
    },
  );

  // 6. Attempt to delete a non-existent script with authentication
  await TestValidator.error(
    "deleting non-existent script should fail",
    async () => {
      const nonExistentId: string & tags.Format<"uuid"> = typia.random<
        string & tags.Format<"uuid">
      >();
      await api.functional.flexOffice.editor.customScripts.erase(connection, {
        id: nonExistentId,
      });
    },
  );
}
