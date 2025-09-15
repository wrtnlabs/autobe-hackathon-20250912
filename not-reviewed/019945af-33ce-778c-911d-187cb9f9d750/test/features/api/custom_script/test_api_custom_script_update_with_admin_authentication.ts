import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";

/**
 * Validate updating a FlexOffice custom script with admin authentication.
 *
 * This test function:
 *
 * 1. Registers and authenticates an admin user to get authorization tokens.
 * 2. Creates a new FlexOffice custom script to have an entity to update.
 * 3. Updates the custom script with new values over several fields.
 * 4. Validates that the update response contains the updated values and
 *    timestamps.
 * 5. Tests updating using a non-existent script ID to verify error handling.
 * 6. Tests unauthorized update attempt with no admin token to verify proper access
 *    control.
 *
 * This ensures the update API endpoint for FlexOffice admin custom scripts is
 * secure, properly updates data, and enforces admin-only update permissions.
 */
export async function test_api_custom_script_update_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "A1b2C3d4!";

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a custom script to update

  // We generate initial data to create the script
  const initialCode = `code_${RandomGenerator.alphaNumeric(8)}`;
  const initialName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const initialDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 6,
    wordMax: 12,
  });
  const initialScriptLanguage = "JavaScript";
  const initialScriptContent = "console.log('initial script');";

  // Since no create API is given, we must simulate creating the entity by updating it with code and initial values
  // Attempting to create a new script by updating a new ID (simulate creation)

  // Generate a new UUID for script ID to use
  const scriptId = typia.random<string & tags.Format<"uuid">>();

  // Perform initial update to create the script
  const createdScript: IFlexOfficeCustomScript =
    await api.functional.flexOffice.admin.customScripts.update(connection, {
      id: scriptId,
      body: {
        code: initialCode,
        name: initialName,
        description: initialDescription,
        script_language: initialScriptLanguage,
        script_content: initialScriptContent,
      } satisfies IFlexOfficeCustomScript.IUpdate,
    });

  typia.assert(createdScript);

  TestValidator.equals("created code matches", createdScript.code, initialCode);
  TestValidator.equals("created name matches", createdScript.name, initialName);
  TestValidator.equals(
    "created description matches",
    createdScript.description,
    initialDescription,
  );
  TestValidator.equals(
    "created language matches",
    createdScript.script_language,
    initialScriptLanguage,
  );
  TestValidator.equals(
    "created content matches",
    createdScript.script_content,
    initialScriptContent,
  );

  // 3. Update the custom script with new values
  const updatedCode = `code_updated_${RandomGenerator.alphaNumeric(6)}`;
  const updatedName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 6,
  });
  const updatedScriptLanguage = "Python";
  const updatedScriptContent = "print('updated script')";

  const updatedScript: IFlexOfficeCustomScript =
    await api.functional.flexOffice.admin.customScripts.update(connection, {
      id: scriptId,
      body: {
        code: updatedCode,
        name: updatedName,
        description: updatedDescription,
        script_language: updatedScriptLanguage,
        script_content: updatedScriptContent,
      } satisfies IFlexOfficeCustomScript.IUpdate,
    });

  typia.assert(updatedScript);

  // Validate fields updated correctly
  TestValidator.equals("updated code matches", updatedScript.code, updatedCode);
  TestValidator.equals("updated name matches", updatedScript.name, updatedName);
  TestValidator.equals(
    "updated description matches",
    updatedScript.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated language matches",
    updatedScript.script_language,
    updatedScriptLanguage,
  );
  TestValidator.equals(
    "updated content matches",
    updatedScript.script_content,
    updatedScriptContent,
  );

  // Updated timestamps must be greater or equal to created timestamps
  TestValidator.predicate(
    "updated_at is updated",
    Date.parse(updatedScript.updated_at) >=
      Date.parse(createdScript.updated_at),
  );
  TestValidator.predicate(
    "created_at unchanged",
    updatedScript.created_at === createdScript.created_at,
  );

  // 4. Attempt updating with a non-existent script ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  if (nonExistentId !== scriptId) {
    await TestValidator.error(
      "update fails for non-existent script id",
      async () => {
        await api.functional.flexOffice.admin.customScripts.update(connection, {
          id: nonExistentId,
          body: {
            name: "Should fail update",
          } satisfies IFlexOfficeCustomScript.IUpdate,
        });
      },
    );
  }

  // 5. Attempt unauthorized update (using a connection without admin token)
  // Create a fresh connection without Authorization headers
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized update attempt fails", async () => {
    await api.functional.flexOffice.admin.customScripts.update(
      unauthorizedConnection,
      {
        id: scriptId,
        body: {
          name: "Unauthorized update",
        } satisfies IFlexOfficeCustomScript.IUpdate,
      },
    );
  });
}
