import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test system admin's ability to view department head details with 3 scenarios:
 *
 * 1. Successful retrieval of known department head (pre-existing or provisioned
 *    externally)
 * 2. 404 Not Found when departmentHeadId is random/non-existent
 * 3. Forbidden access when unauthenticated (no login)
 */
export async function test_api_departmenthead_detail_view_systemadmin_success_fail_cases(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const sysAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoin,
  });
  typia.assert(sysAdmin);

  const sysAdminLogin = {
    email: sysAdminJoin.email,
    provider: "local",
    provider_key: sysAdminJoin.provider_key,
    password: sysAdminJoin.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  await api.functional.auth.systemAdmin.login(connection, {
    body: sysAdminLogin,
  });

  // 2. Attempt to fetch department head detail (success case w/ assumed valid id)
  let knownDepartmentHeadId = typia.random<string & tags.Format<"uuid">>();
  let result: IHealthcarePlatformDepartmentHead | undefined = undefined;
  let found = false;
  try {
    result =
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.at(
        connection,
        { departmentHeadId: knownDepartmentHeadId },
      );
    typia.assert(result);
    found = true;
  } catch (_) {}

  if (found && result) {
    TestValidator.equals(
      "returned id matches request",
      result.id,
      knownDepartmentHeadId,
    );
  } else {
    await TestValidator.error(
      "404: not found for random/invalid department head id",
      async () => {
        await api.functional.healthcarePlatform.systemAdmin.departmentheads.at(
          connection,
          { departmentHeadId: knownDepartmentHeadId },
        );
      },
    );
  }

  // 3. Forbidden access without authentication: simulate by using new connection (headers: {})
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("forbidden when unauthenticated", async () => {
    await api.functional.healthcarePlatform.systemAdmin.departmentheads.at(
      unauthConn,
      { departmentHeadId: knownDepartmentHeadId },
    );
  });
}
