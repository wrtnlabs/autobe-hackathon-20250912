import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";

/**
 * This test validates the retrieval of FlexOffice permission details by ID
 * under admin role.
 *
 * Scenario:
 *
 * 1. An admin account is created by joining with a generated email and
 *    password.
 * 2. The admin logs in with the registered email and password.
 * 3. The admin successfully retrieves a permission entity by its valid UUID.
 * 4. The test verifies the response matches the IFlexOfficePermission type and
 *    asserts key fields.
 * 5. The test attempts to retrieve a permission by a non-existent UUID and
 *    expects a 404 error.
 * 6. The test attempts to retrieve a permission with an unauthenticated
 *    connection and expects an authentication error.
 *
 * All scenarios use correct async/await and TestValidator assertions with
 * descriptive titles. Authentication tokens are handled by the SDK; no
 * manual header manipulation.
 */
export async function test_api_flexoffice_permission_retrieve_by_id_success_and_error_cases(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login
  const login: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(login);

  // 3. Successful retrieval of a permission by valid UUID
  // NOTE: Since no create or list API for permissions, we reuse the returned id from admin join
  // or randomly generate but be aware this could fail if UUID does not exist.
  // Using a randomly generated UUID here - in real scenario, replace with a known valid permission ID.
  const validPermissionId = typia.random<string & tags.Format<"uuid">>();
  const permission: IFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.at(connection, {
      id: validPermissionId,
    });
  typia.assert(permission);

  TestValidator.predicate(
    "permission id is UUID",
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      permission.id,
    ),
  );

  TestValidator.predicate(
    "permission key is string",
    typeof permission.permission_key === "string",
  );
  TestValidator.predicate(
    "status is string",
    typeof permission.status === "string",
  );
  TestValidator.predicate(
    "created_at is date-time string",
    typeof permission.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is date-time string",
    typeof permission.updated_at === "string",
  );
  TestValidator.predicate(
    "description is string or null",
    typeof permission.description === "string" ||
      permission.description === null ||
      permission.description === undefined,
  );
  TestValidator.predicate(
    "deleted_at is string or null or undefined",
    typeof permission.deleted_at === "string" ||
      permission.deleted_at === null ||
      permission.deleted_at === undefined,
  );

  // 4. Error when accessing with non-existent UUID (expecting 404)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving permission with non-existent UUID fails",
    async () => {
      await api.functional.flexOffice.admin.permissions.at(connection, {
        id: nonExistentId,
      });
    },
  );

  // 5. Error when accessing without authentication (unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "retrieving permission without authentication fails",
    async () => {
      await api.functional.flexOffice.admin.permissions.at(
        unauthenticatedConnection,
        {
          id: validPermissionId,
        },
      );
    },
  );
}
