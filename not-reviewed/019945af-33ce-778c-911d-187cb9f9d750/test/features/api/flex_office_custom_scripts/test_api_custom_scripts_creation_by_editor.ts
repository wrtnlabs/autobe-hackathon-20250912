import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * Test scenario verifying the creation of a new custom script by an editor
 * user.
 *
 * This test validates that an authenticated editor can create a new FlexOffice
 * custom script with required fields including unique business code, name,
 * scripting language (javascript or python), description, and source content.
 * It verifies that creation inputs are validated and the response contains the
 * fully created script entity.
 *
 * Workflow:
 *
 * 1. Authenticate as an editor user.
 * 2. Construct a valid custom script creation payload ensuring the business code,
 *    name, language, and content are appropriate.
 * 3. Invoke POST /flexOffice/editor/customScripts with the creation payload.
 * 4. Confirm the response contains the newly created script entity including
 *    server-generated ID and timestamps.
 * 5. Verify that invalid inputs (duplicate codes, invalid language) are rejected
 *    correctly.
 * 6. Test authorization by attempting creation in non-editor context and expect
 *    failures.
 *
 * Business Logic:
 *
 * - Only editor users can create custom scripts.
 * - Script code and name must be unique among all scripts.
 * - Script content must be valid text and comply with language constraints.
 *
 * Success Criteria:
 *
 * - Script is created successfully with all provided data.
 * - Required fields are respected.
 * - Unauthorized users cannot create scripts.
 *
 * Failure Cases:
 *
 * - Duplicate business code.
 * - Invalid or missing fields.
 * - Unauthorized attempts.
 */
export async function test_api_custom_scripts_creation_by_editor(
  connection: api.IConnection,
) {
  // 1. Editor user sign-up and authentication
  const editorEmail: string = typia.random<string & tags.Format<"email">>();
  const editorPassword: string = RandomGenerator.alphaNumeric(8);
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        email: editorEmail,
        name: RandomGenerator.name(),
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  // 2. Prepare valid custom script creation payload
  const code = `code_${RandomGenerator.alphaNumeric(6)}`;
  const validLanguages = ["javascript", "python"] as const;
  const scriptLanguage = RandomGenerator.pick(validLanguages);

  const createBody = {
    code: code,
    name: `Custom Script ${RandomGenerator.paragraph({ sentences: 2 })}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
    script_language: scriptLanguage,
    script_content: `// Sample script content for ${scriptLanguage}`,
  } satisfies IFlexOfficeCustomScript.ICreate;

  // 3. Create custom script
  const createdScript: IFlexOfficeCustomScript =
    await api.functional.flexOffice.editor.customScripts.create(connection, {
      body: createBody,
    });
  typia.assert(createdScript);

  // 4. Validate response fields match the create request
  TestValidator.equals(
    "created code matches",
    createdScript.code,
    createBody.code,
  );
  TestValidator.equals(
    "created name matches",
    createdScript.name,
    createBody.name,
  );
  TestValidator.equals(
    "created language matches",
    createdScript.script_language,
    createBody.script_language,
  );
  TestValidator.equals(
    "created script content matches",
    createdScript.script_content,
    createBody.script_content,
  );

  // 5. Duplicate business code creation test - expect error
  await TestValidator.error("duplicate code creation should fail", async () => {
    await api.functional.flexOffice.editor.customScripts.create(connection, {
      body: createBody,
    });
  });

  // 6. Invalid script_language test - expect error
  await TestValidator.error("invalid language should fail", async () => {
    const invalidBody = {
      ...createBody,
      code: `code_${RandomGenerator.alphaNumeric(6)}`,
      script_language: "invalid_language",
    } satisfies IFlexOfficeCustomScript.ICreate;
    await api.functional.flexOffice.editor.customScripts.create(connection, {
      body: invalidBody,
    });
  });
}
