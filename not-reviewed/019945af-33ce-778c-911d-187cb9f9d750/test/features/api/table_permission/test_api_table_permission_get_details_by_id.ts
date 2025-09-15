import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";

export async function test_api_table_permission_get_details_by_id(
  connection: api.IConnection,
) {
  // 1. Admin user creation via join
  const createRequestBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "StrongP@ssw0rd1",
  } satisfies IFlexOfficeAdmin.ICreate;
  // Send join request and authenticate admin creation
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createRequestBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin user login
  const loginRequestBody = {
    email: createRequestBody.email,
    password: createRequestBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;
  const loginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginRequestBody,
    });
  typia.assert(loginAuthorized);

  // 3. Generate valid UUID for table permission ID to retrieve
  const tablePermissionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve table permission details by ID
  const tablePermission: IFlexOfficeTablePermission =
    await api.functional.flexOffice.admin.tablePermissions.atTablePermission(
      connection,
      {
        id: tablePermissionId,
      },
    );
  typia.assert(tablePermission);

  // 5. Validate returned ID matches requested ID
  TestValidator.equals(
    "table permission ID matches request",
    tablePermission.id,
    tablePermissionId,
  );

  // 6. Validate required properties are present and valid
  TestValidator.predicate(
    "permission_id is non-empty string",
    typeof tablePermission.permission_id === "string" &&
      tablePermission.permission_id.length > 0,
  );
  TestValidator.predicate(
    "table_name is non-empty string",
    typeof tablePermission.table_name === "string" &&
      tablePermission.table_name.length > 0,
  );

  // 7. Validate timestamps are ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof tablePermission.created_at === "string" &&
      /^\d{4}-[01]\d-[0-3]\d[T ][0-2]\d:[0-5]\d:[0-5]\d(Z|[+-][01]\d:[0-5]\d)?$/.test(
        tablePermission.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    typeof tablePermission.updated_at === "string" &&
      /^\d{4}-[01]\d-[0-3]\d[T ][0-2]\d:[0-5]\d:[0-5]\d(Z|[+-][01]\d:[0-5]\d)?$/.test(
        tablePermission.updated_at,
      ),
  );

  // 8. Explicitly check deleted_at may be null or ISO 8601 date-time if present
  if (
    tablePermission.deleted_at !== null &&
    tablePermission.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is ISO 8601 date-time if present",
      typeof tablePermission.deleted_at === "string" &&
        /^\d{4}-[01]\d-[0-3]\d[T ][0-2]\d:[0-5]\d:[0-5]\d(Z|[+-][01]\d:[0-5]\d)?$/.test(
          tablePermission.deleted_at,
        ),
    );
  }

  // 9. Negative testing unauthorized access
  // Create a new connection without auth headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized access should throw error",
    async () => {
      await api.functional.flexOffice.admin.tablePermissions.atTablePermission(
        unauthConnection,
        { id: tablePermissionId },
      );
    },
  );
}
