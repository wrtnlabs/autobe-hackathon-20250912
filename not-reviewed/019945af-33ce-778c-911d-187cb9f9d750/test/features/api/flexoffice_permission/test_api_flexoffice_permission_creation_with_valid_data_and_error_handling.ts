import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";

/**
 * Tests the creation of FlexOffice permission entities with valid and
 * invalid data.
 *
 * This test includes user lifecycle for admin authentication ensuring
 * authorized access for creation operations. The workflow involves:
 *
 * 1. Admin joins the system with a unique email and password.
 * 2. Admin logs in with valid credentials to obtain authorization tokens.
 * 3. Admin creates a new permission with a unique permission key, an optional
 *    description, and a valid status.
 * 4. The test asserts the created permission contains all required properties
 *    and the submitted key and status.
 * 5. Attempts to create a permission with a duplicate key to confirm
 *    validation error.
 * 6. Attempts to create a permission with an invalid status (e.g. empty or
 *    invalid string) to verify validation failure handling.
 *
 * This end-to-end test ensures that permission creation respects business
 * rules including uniqueness constraints and status validity, and that the
 * authentication system correctly authorizes these operations.
 */
export async function test_api_flexoffice_permission_creation_with_valid_data_and_error_handling(
  connection: api.IConnection,
) {
  // 1. Admin joins the system
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const initialAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminStrongPass123!",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(initialAdmin);

  // 2. Admin logs in
  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "AdminStrongPass123!",
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Admin creates a new permission with unique key
  const permissionKey = `perm_${RandomGenerator.alphaNumeric(8)}`;
  const permissionDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 8,
  });
  const validStatus = "active";

  const newPermission: IFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.create(connection, {
      body: {
        permission_key: permissionKey,
        description: permissionDescription,
        status: validStatus,
      } satisfies IFlexOfficePermission.ICreate,
    });
  typia.assert(newPermission);

  TestValidator.equals(
    "created permission key matches input",
    newPermission.permission_key,
    permissionKey,
  );
  TestValidator.equals(
    "created permission status matches input",
    newPermission.status,
    validStatus,
  );

  // 4. Attempt to create a permission with the same duplicate permission key
  await TestValidator.error(
    "duplicate permission key should result in error",
    async () => {
      await api.functional.flexOffice.admin.permissions.create(connection, {
        body: {
          permission_key: permissionKey, // duplicate
          description: "Duplicate test",
          status: "active",
        } satisfies IFlexOfficePermission.ICreate,
      });
    },
  );

  // 5. Attempt to create a permission with invalid status (empty string)
  await TestValidator.error(
    "creating permission with invalid status should fail",
    async () => {
      await api.functional.flexOffice.admin.permissions.create(connection, {
        body: {
          permission_key: `perm_${RandomGenerator.alphaNumeric(8)}`,
          description: "Invalid status test",
          status: "", // invalid empty status
        } satisfies IFlexOfficePermission.ICreate,
      });
    },
  );
}
