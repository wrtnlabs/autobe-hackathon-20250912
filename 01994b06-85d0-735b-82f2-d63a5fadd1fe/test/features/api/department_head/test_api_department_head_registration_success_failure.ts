import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Test department head registration: success, duplicate email error, required
 * field and forbidden/archived join edge-cases.
 *
 * 1. Register a department head with valid fields (success).
 * 2. Attempt duplicate join (email used) -- must fail.
 * 3. Try forbidden or soft-deleted account registration -- simulate via special
 *    email. (Missing required/type errors are not tested--see E2E
 *    constraints.)
 */
export async function test_api_department_head_registration_success_failure(
  connection: api.IConnection,
) {
  // 1. Successful join
  const baseEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: baseEmail,
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;

  const authorized = await api.functional.auth.departmentHead.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "joined email matches",
    authorized.email,
    joinBody.email,
  );
  TestValidator.equals(
    "joined full_name matches",
    authorized.full_name,
    joinBody.full_name,
  );
  TestValidator.predicate(
    "authorization token issued",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.equals(
    "role is departmentHead",
    authorized.role,
    "departmentHead",
  );
  TestValidator.predicate(
    "account not deleted",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  // 2. Duplicate email fails
  await TestValidator.error("duplicate email join must fail", async () => {
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        ...joinBody,
        full_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  });

  // 3. Simulate soft-deleted/forbidden account join (edge-case)
  //    Use a unique pattern to represent a forbidden/join-archived scenario.
  const forbiddenEmail = `deleted+${Date.now()}@test.com` as string &
    tags.Format<"email">;
  const forbiddenJoinBody = {
    email: forbiddenEmail,
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  await TestValidator.error(
    "forbidden/archived account join must fail",
    async () => {
      await api.functional.auth.departmentHead.join(connection, {
        body: forbiddenJoinBody,
      });
    },
  );
}
