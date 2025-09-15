import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate the system admin department head deletion workflow.
 *
 * Steps:
 *
 * 1. Register (join) as a new system admin (random unique business email and
 *    name).
 * 2. Login as system admin using credentials.
 * 3. Create a new department head.
 * 4. Delete department head by id as system admin.
 * 5. Attempt to delete the same department head again – expect a failure.
 * 6. Attempt to delete a totally random (non-existent) department head id –
 *    expect a failure.
 *
 * Verification:
 *
 * - Each step uses strict DTO types and value assertions.
 * - Error scenarios are validated using TestValidator.error (with required
 *   title as first argument).
 */
export async function test_api_department_head_deletion_system_admin_role(
  connection: api.IConnection,
) {
  // 1. Register as system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminFullName = RandomGenerator.name(2);
  const sysAdminProvider = "local";
  const sysAdminProviderKey = sysAdminEmail;
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);

  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: sysAdminFullName,
      provider: sysAdminProvider,
      provider_key: sysAdminProviderKey,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);
  TestValidator.equals("system admin email", sysAdmin.email, sysAdminEmail);

  // 2. Login as system admin
  const sysAdminSession = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysAdminEmail,
        provider: sysAdminProvider,
        provider_key: sysAdminProviderKey,
        password: sysAdminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminSession);
  TestValidator.equals(
    "login session system admin email",
    sysAdminSession.email,
    sysAdminEmail,
  );

  // 3. Department head creation
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadFullName = RandomGenerator.name(2);
  const deptHeadPhone = RandomGenerator.mobile();
  const departmentHead =
    await api.functional.healthcarePlatform.systemAdmin.departmentheads.create(
      connection,
      {
        body: {
          email: deptHeadEmail,
          full_name: deptHeadFullName,
          phone: deptHeadPhone,
        } satisfies IHealthcarePlatformDepartmentHead.ICreate,
      },
    );
  typia.assert(departmentHead);
  TestValidator.equals(
    "department head email matches input",
    departmentHead.email,
    deptHeadEmail,
  );
  TestValidator.equals(
    "department head full name matches input",
    departmentHead.full_name,
    deptHeadFullName,
  );
  TestValidator.equals(
    "department head phone matches input",
    departmentHead.phone,
    deptHeadPhone,
  );

  // 4. Delete department head just created
  await api.functional.healthcarePlatform.systemAdmin.departmentheads.erase(
    connection,
    {
      departmentHeadId: departmentHead.id,
    },
  );

  // 5. Attempt to delete the same department head again (should fail)
  await TestValidator.error(
    "second deletion of same department head should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.erase(
        connection,
        {
          departmentHeadId: departmentHead.id,
        },
      );
    },
  );

  // 6. Attempt to delete a completely random (non-existent) department head id (should fail)
  const randomDeptHeadId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent department head should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.erase(
        connection,
        {
          departmentHeadId: randomDeptHeadId,
        },
      );
    },
  );
}
