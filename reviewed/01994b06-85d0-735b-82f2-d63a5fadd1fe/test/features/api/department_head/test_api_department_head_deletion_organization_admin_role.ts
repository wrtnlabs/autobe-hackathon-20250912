import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate that an organization admin can delete a department head record and
 * deletion is not idempotent (second delete triggers error).
 *
 * 1. Register and login as an organization admin
 * 2. Create a department head
 * 3. Delete that department head by ID
 * 4. Delete the department head again to confirm business logic on non-existent
 *    (should trigger error)
 * 5. (Optional) Attempt to fetch the deleted department head for further
 *    confirmation (not possible with current API set)
 */
export async function test_api_department_head_deletion_organization_admin_role(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Login as organization admin
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const auth = await api.functional.auth.organizationAdmin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(auth);

  // 3. Create a department head
  const departmentHeadBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.ICreate;
  const deptHead =
    await api.functional.healthcarePlatform.organizationAdmin.departmentheads.create(
      connection,
      { body: departmentHeadBody },
    );
  typia.assert(deptHead);

  // 4. Delete the department head
  await api.functional.healthcarePlatform.organizationAdmin.departmentheads.erase(
    connection,
    { departmentHeadId: deptHead.id },
  );

  // 5. Attempt to delete again should yield an error
  await TestValidator.error(
    "deleting non-existent department head triggers error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.departmentheads.erase(
        connection,
        { departmentHeadId: deptHead.id },
      );
    },
  );
}
