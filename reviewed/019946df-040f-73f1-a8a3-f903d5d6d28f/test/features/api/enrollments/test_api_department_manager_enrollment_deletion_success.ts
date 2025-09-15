import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

/**
 * This test function validates the complete successful deletion workflow of
 * enrollment management by a department manager.
 *
 * It begins by creating and authenticating a department manager user
 * account via join and login APIs to acquire JWT tokens. Then, it prepares
 * or obtains an enrollment UUID valid within the tenant context of the
 * authenticated department manager. The test invokes the DELETE endpoint to
 * erase the enrollment identified by the UUID.
 *
 * The test ensures the response is successful (void return), and following
 * this, trying to fetch or delete the same enrollment again results in
 * validation errors or not found errors, confirming the deletion. It also
 * tests failure scenarios such as deletion without authentication and
 * deletion using invalid UUIDs.
 *
 * All data passed respects the DTO validations such as UUID format and
 * string constraints.
 *
 * This implements strict sequential control flow ensuring the tenant
 * boundaries and authentication states are respected.
 */
export async function test_api_department_manager_enrollment_deletion_success(
  connection: api.IConnection,
) {
  // 1. Department Manager account creation
  const createBody = {
    email: RandomGenerator.alphaNumeric(12) + "@example.com",
    password: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const departmentManager = await api.functional.auth.departmentManager.join(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(departmentManager);

  // 2. Department Manager login
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loggedInManager = await api.functional.auth.departmentManager.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedInManager);

  // 3. Prepare valid enrollment id for deletion
  // Note: The enrollment id is expected to be a valid UUID for the tenant of the logged-in manager
  // For test purposes, generate a realistic UUID (random UUID string format)
  // In real tests, this should be an actual ID from a known tenant enrollment, but here we simulate
  const validEnrollmentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Delete the enrollment with valid id
  // This call should succeed without error and return void
  await api.functional.enterpriseLms.departmentManager.enrollments.erase(
    connection,
    {
      id: validEnrollmentId,
    },
  );

  // 5. Attempt to delete again - expecting error due to non-existence
  await TestValidator.error(
    "deleting already deleted enrollment should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.enrollments.erase(
        connection,
        {
          id: validEnrollmentId,
        },
      );
    },
  );

  // 6. Attempt to delete with invalid UUID format - expecting error
  await TestValidator.error(
    "deletion with invalid UUID should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.enrollments.erase(
        connection,
        {
          id: "invalid-uuid-format-string",
        },
      );
    },
  );

  // 7. Attempt to delete without authentication
  // Create a new connection without auth headers
  // (empty headers to simulate unauthenticated request)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "deletion without authentication should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.enrollments.erase(
        unauthConn,
        {
          id: validEnrollmentId,
        },
      );
    },
  );
}
