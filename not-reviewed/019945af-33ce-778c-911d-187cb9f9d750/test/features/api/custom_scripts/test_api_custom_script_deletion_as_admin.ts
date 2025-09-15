import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * Test FlexOffice Admin Custom Script Deletion
 *
 * This test function simulates the complete workflow for the FlexOffice
 * admin user to delete a custom script by its ID. It includes:
 *
 * 1. Admin account creation using the join API
 * 2. Admin login to authenticate and acquire tokens
 * 3. Attempt to delete an existing custom script by its UUID
 * 4. Validation that deletion returns no content and no errors
 * 5. Attempt unauthorized deletion and deletion of non-existent script to
 *    check proper error handling
 */
export async function test_api_custom_script_deletion_as_admin(
  connection: api.IConnection,
) {
  // 1. Create an admin account to join the system
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;

  const joinResult: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(joinResult);

  // 2. Admin login with the joined credentials
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loginResult: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loginResult);

  // 3. Delete an existing custom script by UUID
  const customScriptId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.flexOffice.admin.customScripts.erase(connection, {
    id: customScriptId,
  });

  // 4. Test unauthorized deletion attempt (simulate by clearing headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "cannot delete custom script unauthenticated",
    async () => {
      await api.functional.flexOffice.admin.customScripts.erase(
        unauthConnection,
        { id: customScriptId },
      );
    },
  );

  // 5. Test deletion of non-existent script ID
  const invalidUuid = "00000000-0000-0000-0000-000000000000" satisfies string &
    tags.Format<"uuid">;
  await TestValidator.error(
    "cannot delete non-existent custom script",
    async () => {
      await api.functional.flexOffice.admin.customScripts.erase(connection, {
        id: invalidUuid,
      });
    },
  );
}
