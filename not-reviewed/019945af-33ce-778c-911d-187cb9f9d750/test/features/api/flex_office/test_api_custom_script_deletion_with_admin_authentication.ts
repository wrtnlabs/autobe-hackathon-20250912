import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * Verify that admin can delete a custom script and handle error cases.
 *
 * This test performs the following steps:
 *
 * 1. Register and authenticate an admin user.
 * 2. Delete a custom script with a generated UUID to simulate a created script.
 * 3. Attempt to delete the same script again to verify error handling for
 *    non-existent scripts.
 *
 * Note: APIs for creating and retrieving custom scripts are not provided and
 * thus omitted. Unauthorized deletion attempts are also not tested due to lack
 * of suitable APIs.
 */
export async function test_api_custom_script_deletion_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = `${RandomGenerator.alphaNumeric(4)}${RandomGenerator.alphabets(4)}!`;
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Delete a custom script using a random UUID as script id
  const scriptId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.flexOffice.admin.customScripts.erase(connection, {
    id: scriptId,
  });

  // 3. Attempt to delete the same script again should result in an error
  await TestValidator.error(
    "deleting non-existent custom script should fail",
    async () => {
      await api.functional.flexOffice.admin.customScripts.erase(connection, {
        id: scriptId,
      });
    },
  );
}
