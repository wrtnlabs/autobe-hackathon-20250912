import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

/**
 * This scenario tests the update operation of a Department Manager user within
 * the tenant-aware multi-tenant enterprise LMS context. It covers user
 * creation, authentication, valid updates, and error handling for invalid
 * updates and non-existent users.
 *
 * The workflow is:
 *
 * 1. Create and authenticate a new department manager user for a tenant.
 * 2. Perform a valid update on the user's details including email, names, and
 *    status.
 * 3. Validate the response reflects the updates and maintains correct identifiers.
 * 4. Attempt to update a non-existent department manager ID and expect an error.
 * 5. Check invalid updates such as malformed email and invalid status to ensure
 *    validation failures.
 *
 * This ensures business logic validity, proper multi-tenant scoping, and API
 * contract compliance.
 */
export async function test_api_department_manager_update_valid_and_invalid_scenarios(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new department manager user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const joinBody = {
    email: `test+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "password1234",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const authorized: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Login as the created department manager
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loginAuthorized: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Valid update for the department manager's details
  const updateBodyValid = {
    email: `updated+${RandomGenerator.alphaNumeric(8)}@example.com`,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
    deleted_at: null,
  } satisfies IEnterpriseLmsDepartmentManager.IUpdate;

  const updated: IEnterpriseLmsDepartmentManager =
    await api.functional.enterpriseLms.departmentManager.departmentmanagers.update(
      connection,
      {
        departmentmanagerId: authorized.id,
        body: updateBodyValid,
      },
    );
  typia.assert(updated);

  TestValidator.equals("updated id matches", updated.id, authorized.id);
  TestValidator.equals(
    "updated email matches",
    updated.email,
    updateBodyValid.email,
  );
  TestValidator.equals(
    "updated first name matches",
    updated.first_name,
    updateBodyValid.first_name,
  );
  TestValidator.equals(
    "updated last name matches",
    updated.last_name,
    updateBodyValid.last_name,
  );
  TestValidator.equals(
    "updated status matches",
    updated.status,
    updateBodyValid.status,
  );

  TestValidator.predicate(
    "created_at is ISO string",
    typeof updated.created_at === "string" && updated.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof updated.updated_at === "string" && updated.updated_at.length > 0,
  );

  // 4. Attempt update with non-existent department manager ID
  await TestValidator.error("update fails with non-existent id", async () => {
    await api.functional.enterpriseLms.departmentManager.departmentmanagers.update(
      connection,
      {
        departmentmanagerId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBodyValid,
      },
    );
  });

  // 5. Attempt invalid update field values - invalid email format
  await TestValidator.error("update fails with invalid email", async () => {
    const invalidEmailUpdate = {
      email: "not-an-email",
    } satisfies IEnterpriseLmsDepartmentManager.IUpdate;

    await api.functional.enterpriseLms.departmentManager.departmentmanagers.update(
      connection,
      {
        departmentmanagerId: authorized.id,
        body: invalidEmailUpdate,
      },
    );
  });

  // 6. Attempt invalid update field values - invalid status
  await TestValidator.error("update fails with invalid status", async () => {
    const invalidStatusUpdate = {
      status: "invalid_status",
    } satisfies IEnterpriseLmsDepartmentManager.IUpdate;

    await api.functional.enterpriseLms.departmentManager.departmentmanagers.update(
      connection,
      {
        departmentmanagerId: authorized.id,
        body: invalidStatusUpdate,
      },
    );
  });
}
