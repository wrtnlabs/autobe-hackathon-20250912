import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * Test detailed retrieval of admin user.
 *
 * This tests the entire flow of creating a new admin, authenticating,
 * retrieving the detailed information by ID, and handling error cases.
 *
 * 1. Register a new admin user.
 * 2. Authenticate to obtain the access token.
 * 3. Retrieve admin details using the obtained token.
 * 4. Attempt to retrieve details with invalid adminId.
 * 5. Attempt to retrieve details without authentication.
 */
export async function test_api_admin_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const createBody = {
    email: RandomGenerator.alphaNumeric(6) + `@example.com`,
    password: "Password123!",
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(adminAuth);

  // 2. Authenticate the same admin user
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loginAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loginAuth);

  // 3. Retrieve admin detail by ID
  const adminDetail: IFlexOfficeAdmin =
    await api.functional.flexOffice.admin.admins.atAdmin(connection, {
      adminId: adminAuth.id,
    });
  typia.assert(adminDetail);
  TestValidator.equals(
    "admin detail id matches created admin",
    adminDetail.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "admin detail email matches created admin",
    adminDetail.email,
    createBody.email,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof adminDetail.created_at === "string" &&
      adminDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof adminDetail.updated_at === "string" &&
      adminDetail.updated_at.length > 0,
  );

  // 4. Attempt to retrieve detail with invalid adminId different from actual
  let invalidAdminId = typia.random<string & tags.Format<"uuid">>();
  while (invalidAdminId === adminAuth.id) {
    invalidAdminId = typia.random<string & tags.Format<"uuid">>();
  }
  await TestValidator.error(
    "retrieving with invalid adminId throws",
    async () => {
      await api.functional.flexOffice.admin.admins.atAdmin(connection, {
        adminId: invalidAdminId,
      });
    },
  );

  // 5. Attempt to retrieve detail without authentication - clone connection without headers to simulate unauthenticated context
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request is rejected", async () => {
    await api.functional.flexOffice.admin.admins.atAdmin(unauthConn, {
      adminId: adminAuth.id,
    });
  });
}
