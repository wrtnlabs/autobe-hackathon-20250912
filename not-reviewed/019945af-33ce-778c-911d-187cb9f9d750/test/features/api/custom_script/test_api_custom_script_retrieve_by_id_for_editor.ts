import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * This test function validates editor role users' ability to retrieve detailed
 * information of a FlexOffice custom script by ID.
 *
 * Workflow:
 *
 * 1. Register and authenticate as an editor user via /auth/editor/join.
 * 2. Test error responses for unauthorized access and non-existent script ID.
 *
 * Due to lack of an API for creating custom scripts, the positive retrieval
 * test with a known script ID is omitted, focusing on failure and auth
 * scenarios.
 */
export async function test_api_custom_script_retrieve_by_id_for_editor(
  connection: api.IConnection,
) {
  // 1. Register new editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorAuthorized);

  // 2. Editor login with same email and password (simulate realistic login)
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const editorLoginAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(editorLoginAuthorized);

  // 3. Test error scenario: retrieving non-existent custom script ID fails
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent custom script ID should fail",
    async () => {
      await api.functional.flexOffice.editor.customScripts.at(connection, {
        id: nonExistentId,
      });
    },
  );

  // 4. Test error scenario: unauthorized retrieval without token fails
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Using non-existent ID as input, since no valid ID is known
  await TestValidator.error(
    "unauthorized retrieval without token should fail",
    async () => {
      await api.functional.flexOffice.editor.customScripts.at(
        unauthConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
