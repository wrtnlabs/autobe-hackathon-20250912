import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeEditConflicts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditConflicts";

/**
 * This E2E test validates the retrieval of detailed information about a
 * specific edit conflict from the FlexOffice admin API.
 *
 * The test covers the following scenario in detail:
 *
 * 1. Register a new admin user with a unique email and password.
 * 2. Authenticate the admin user by logging in with the registered credentials.
 * 3. Prepare a new edit conflict record for testing with realistic properties.
 * 4. Invoke the GET /flexOffice/admin/editConflicts/{editConflictId} endpoint.
 * 5. Validate that the API returns all expected properties correctly.
 * 6. Test unauthorized access and verify that an error is thrown.
 * 7. Test error handling with invalid editConflictId values and verify errors.
 *
 * All API responses are validated with typia.assert() to ensure type
 * correctness and full schema compliance.
 */
export async function test_api_edit_conflict_retrieval_admin_role_success(
  connection: api.IConnection,
) {
  // 1. Register an admin with random email/password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongP@ssw0rd!";
  const adminCreated: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminCreated);

  // 2. Login with the same admin credentials
  const adminLoggedIn: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // 3. Prepare a simulated edit conflict record
  const simulatedEditConflict = typia.random<IFlexOfficeEditConflicts>();
  typia.assert(simulatedEditConflict);

  // 4. Call API to get edit conflict details by ID
  const retrievedConflict =
    await api.functional.flexOffice.admin.editConflicts.getEditConflict(
      connection,
      {
        editConflictId: simulatedEditConflict.id,
      },
    );
  typia.assert(retrievedConflict);

  // 5. Validate that retrieved conflict matches the simulated data
  TestValidator.equals(
    "retrieved conflict matches simulated conflict",
    retrievedConflict,
    simulatedEditConflict,
  );

  // 6. Test unauthorized access with separate unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access without login should fail",
    async () => {
      await api.functional.flexOffice.admin.editConflicts.getEditConflict(
        unauthenticatedConnection,
        {
          editConflictId: simulatedEditConflict.id,
        },
      );
    },
  );

  // 7. Validate error response with invalid editConflictId values
  const invalidIds = ["invalid-uuid", ""];
  await ArrayUtil.asyncForEach(invalidIds, async (invalidId) => {
    await TestValidator.error(
      `invalid editConflictId '${invalidId}' should fail`,
      async () => {
        await api.functional.flexOffice.admin.editConflicts.getEditConflict(
          connection,
          {
            editConflictId: invalidId,
          },
        );
      },
    );
  });
}
