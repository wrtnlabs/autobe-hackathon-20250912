import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";

/**
 * This test validates the full workflow of creating a FlexOffice custom script
 * with admin authentication. It ensures the admin user can sign up and log in,
 * create a custom script, handle duplicate script code errors, and confirms
 * unauthenticated requests are rejected. All properties adhere strictly to API
 * contracts.
 *
 * Steps:
 *
 * 1. Create an admin user and obtain an authorization token.
 * 2. Log in as the admin to verify authentication.
 * 3. Create a new custom script with unique code, name, programming language
 *    (JavaScript or Python), and source content. Optional fields description
 *    and deleted_at are set to null.
 * 4. Verify successful creation by asserting response content and types.
 * 5. Attempt duplicate creation with identical code and expect failure.
 * 6. Attempt to create a script without authentication and expect rejection.
 */
export async function test_api_custom_script_creation_with_admin_auth(
  connection: api.IConnection,
) {
  // 1. Admin signup
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongP@ssword123";
  const createdAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // 2. Admin login
  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Create a new custom script
  const scriptCode = RandomGenerator.alphaNumeric(12).toLowerCase();
  const scriptName = RandomGenerator.name(2);
  const scriptLanguage = RandomGenerator.pick([
    "JavaScript",
    "Python",
  ] as const);
  const scriptContent = "console.log('Hello, FlexOffice!');";
  const customScriptCreationBody = {
    code: scriptCode,
    name: scriptName,
    description: null,
    script_language: scriptLanguage,
    script_content: scriptContent,
  } satisfies IFlexOfficeCustomScript.ICreate;

  const createdScript: IFlexOfficeCustomScript =
    await api.functional.flexOffice.admin.customScripts.create(connection, {
      body: customScriptCreationBody,
    });
  typia.assert(createdScript);

  TestValidator.equals(
    "created script code matches",
    createdScript.code,
    scriptCode,
  );
  TestValidator.equals(
    "created script name matches",
    createdScript.name,
    scriptName,
  );
  TestValidator.equals(
    "created script language matches",
    createdScript.script_language,
    scriptLanguage,
  );
  TestValidator.equals(
    "created script content matches",
    createdScript.script_content,
    scriptContent,
  );
  TestValidator.equals(
    "created script description null",
    createdScript.description,
    null,
  );

  // 4. Attempt to create duplicate script code (should fail)
  await TestValidator.error(
    "duplicate custom script code rejection",
    async () => {
      await api.functional.flexOffice.admin.customScripts.create(connection, {
        body: {
          code: scriptCode,
          name: RandomGenerator.name(2),
          description: "Duplicate attempt",
          script_language: scriptLanguage,
          script_content: scriptContent,
        } satisfies IFlexOfficeCustomScript.ICreate,
      });
    },
  );

  // 5. Attempt to create a script without authentication (expect failure)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated script creation rejection",
    async () => {
      await api.functional.flexOffice.admin.customScripts.create(
        unauthenticatedConnection,
        {
          body: {
            code: RandomGenerator.alphaNumeric(12).toLowerCase(),
            name: RandomGenerator.name(2),
            description: null,
            script_language: RandomGenerator.pick([
              "JavaScript",
              "Python",
            ] as const),
            script_content: scriptContent,
          } satisfies IFlexOfficeCustomScript.ICreate,
        },
      );
    },
  );
}
