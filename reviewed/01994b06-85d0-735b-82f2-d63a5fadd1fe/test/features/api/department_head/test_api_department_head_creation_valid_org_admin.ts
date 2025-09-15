import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate successful creation and access control of healthcare department head
 * creation by organization admin.
 *
 * 1. Register a new organization admin (unique business email, name, password,
 *    optional phone)
 * 2. Login as the admin to obtain token/auth header (handled internally)
 * 3. Create a new department head with valid unique business email, full legal
 *    name, phone (sometimes null)
 * 4. Assert the created record is correct:
 *
 *    - Email, full_name, phone, id present and of correct format
 *    - Created_at, updated_at are ISO8601 datetime strings
 *    - Deleted_at is null/undefined
 * 5. Attempt to create department head with same email (should error on duplicate)
 * 6. Attempt to create department head when not authenticated as org admin (should
 *    error on authorization)
 */
export async function test_api_department_head_creation_valid_org_admin(
  connection: api.IConnection,
) {
  // 1. Register a new org admin
  const adminEmail = `${RandomGenerator.alphabets(10)}@company.com`;
  const adminFullName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminPhone = RandomGenerator.mobile();
  const joinResult = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        phone: adminPhone,
        password: adminPassword,
      },
    },
  );
  typia.assert(joinResult);
  TestValidator.equals(
    "org admin join: returned email matches",
    joinResult.email,
    adminEmail,
  );
  TestValidator.equals(
    "org admin join: returned full name matches",
    joinResult.full_name,
    adminFullName,
  );

  // 2. Login as that org admin
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      },
    },
  );
  typia.assert(loginResult);
  TestValidator.equals("org admin login: email", loginResult.email, adminEmail);

  // 3. Create a new department head (valid, unique email)
  const deptEmail = `${RandomGenerator.alphabets(12)}@dept.company.com`;
  const deptName = RandomGenerator.name();
  const deptPhone = RandomGenerator.mobile();
  const createResult =
    await api.functional.healthcarePlatform.organizationAdmin.departmentheads.create(
      connection,
      {
        body: {
          email: deptEmail,
          full_name: deptName,
          phone: deptPhone,
        },
      },
    );
  typia.assert(createResult);
  TestValidator.equals(
    "department head: email matches input",
    createResult.email,
    deptEmail,
  );
  TestValidator.equals(
    "department head: full_name matches input",
    createResult.full_name,
    deptName,
  );
  TestValidator.equals(
    "department head: phone matches input",
    createResult.phone,
    deptPhone,
  );
  TestValidator.predicate(
    "department head: id is UUID",
    typeof createResult.id === "string" && createResult.id.length > 0,
  );
  TestValidator.predicate(
    "department head: created_at is ISO",
    typeof createResult.created_at === "string" &&
      createResult.created_at.includes("T"),
  );
  TestValidator.predicate(
    "department head: updated_at is ISO",
    typeof createResult.updated_at === "string" &&
      createResult.updated_at.includes("T"),
  );
  TestValidator.equals(
    "department head: deleted_at is null or undefined",
    createResult.deleted_at ?? null,
    null,
  );

  // 4. Attempt to create department head with same email (should error on duplicate)
  await TestValidator.error(
    "duplicate department head email rejected",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.departmentheads.create(
        connection,
        {
          body: {
            email: deptEmail,
            full_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
          },
        },
      );
    },
  );

  // 5. Attempt to create department head when not authenticated as org admin
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "authorization required for department head creation",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.departmentheads.create(
        unauthConn,
        {
          body: {
            email: `${RandomGenerator.alphabets(10)}@unauth.company.com`,
            full_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
          },
        },
      );
    },
  );
}
