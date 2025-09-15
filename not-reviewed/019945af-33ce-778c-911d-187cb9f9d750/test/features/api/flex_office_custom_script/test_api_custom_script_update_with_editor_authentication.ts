import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * This test validates updating an existing custom script by an editor user in
 * the FlexOffice system. It covers the full workflow from editor registration,
 * login, custom script creation, to updating it.
 *
 * The test ensures that editing the custom script's name, code, language,
 * description, and source content succeeds and the updated data matches. It
 * also tests error scenarios for updating a non-existent script ID and for
 * unauthorized update attempts.
 */
export async function test_api_custom_script_update_with_editor_authentication(
  connection: api.IConnection,
) {
  // 1. Editor user registration and authentication
  const editorCreate = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Aa1!" + RandomGenerator.alphaNumeric(8), // sufficiently strong simple password
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: editorCreate });
  typia.assert(editorAuthorized);

  // 2. Since no create API exists, use update API with a new UUID to simulate creation
  // Note: This depends on server behavior; typically PUT on non-existent id errors.
  // Here, we assume it creates or updates, per scenario requirements.
  const scriptId = typia.random<string & tags.Format<"uuid">>();

  const initialCreateData: IFlexOfficeCustomScript.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    code: RandomGenerator.alphaNumeric(8),
    script_language: RandomGenerator.pick(["javascript", "python"] as const),
    description: "Initial description",
    script_content: "console.log('Initial script');",
  };

  const updatedInitialScript: IFlexOfficeCustomScript =
    await api.functional.flexOffice.editor.customScripts.update(connection, {
      id: scriptId,
      body: initialCreateData,
    });
  typia.assert(updatedInitialScript);

  TestValidator.equals(
    "initial name",
    updatedInitialScript.name,
    initialCreateData.name!,
  );
  TestValidator.equals(
    "initial code",
    updatedInitialScript.code,
    initialCreateData.code!,
  );
  TestValidator.equals(
    "initial description",
    updatedInitialScript.description,
    initialCreateData.description!,
  );
  TestValidator.equals(
    "initial script_language",
    updatedInitialScript.script_language,
    initialCreateData.script_language!,
  );
  TestValidator.equals(
    "initial script_content",
    updatedInitialScript.script_content,
    initialCreateData.script_content!,
  );

  // 3. Perform an update with changed data
  const updateData: IFlexOfficeCustomScript.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    code: RandomGenerator.alphaNumeric(10),
    script_language:
      initialCreateData.script_language === "javascript"
        ? "python"
        : "javascript",
    description: null, // Explicit null to test removal
    script_content: "print('Updated script content')",
  };

  const updatedScript: IFlexOfficeCustomScript =
    await api.functional.flexOffice.editor.customScripts.update(connection, {
      id: updatedInitialScript.id,
      body: updateData,
    });
  typia.assert(updatedScript);

  TestValidator.equals("updated name", updatedScript.name, updateData.name!);
  TestValidator.equals("updated code", updatedScript.code, updateData.code!);
  TestValidator.equals("updated description", updatedScript.description, null);
  TestValidator.equals(
    "updated script_language",
    updatedScript.script_language,
    updateData.script_language!,
  );
  TestValidator.equals(
    "updated script_content",
    updatedScript.script_content,
    updateData.script_content!,
  );

  // 4. Attempt update on non-existent script id
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with non-existent id should fail",
    async () => {
      await api.functional.flexOffice.editor.customScripts.update(connection, {
        id: nonExistentId,
        body: {
          name: "Non-existent script",
        } satisfies IFlexOfficeCustomScript.IUpdate,
      });
    },
  );

  // 5. Unauthorized update test
  // Register another editor user to simulate unauthorized access
  const editorCreate2 = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Aa1!" + RandomGenerator.alphaNumeric(8),
  } satisfies IFlexOfficeEditor.ICreate;
  const editorAuthorized2: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: editorCreate2 });
  typia.assert(editorAuthorized2);

  // Attempt to update the original script with different editor
  await TestValidator.error(
    "unauthorized editor update should fail",
    async () => {
      await api.functional.flexOffice.editor.customScripts.update(connection, {
        id: updatedInitialScript.id,
        body: {
          name: "Unauthorized edit attempt",
        } satisfies IFlexOfficeCustomScript.IUpdate,
      });
    },
  );
}
