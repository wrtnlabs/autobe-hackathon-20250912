import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates the update of a department head's profile by an organization admin,
 * covering both positive and negative cases (duplication, not found,
 * unauthorized).
 *
 * Business context: Organization admins must update department head information
 * for compliance or operational accuracy. This test validates data integrity
 * (uniqueness, audit timestamps), error handling, and access control.
 *
 * Steps:
 *
 * 1. Register an organization admin (unique email).
 * 2. Log in as the admin to establish session.
 * 3. Create a department head (store for update).
 * 4. Successfully update profile fields (change full name, phone, email).
 * 5. Validate updates are applied (timestamps, values change).
 * 6. Negative: Attempt update to duplicate email, expect error.
 * 7. Negative: Attempt update to nonexistent departmentHeadId, expect not found
 *    error.
 * 8. Negative: Attempt update with unauthenticated connection, expect forbidden
 *    error.
 */
export async function test_api_department_head_update_profile_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register a unique organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminFullName = RandomGenerator.name();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);

  const joinResult = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: orgAdminFullName,
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(joinResult);

  // 2. Login as the org admin (sets token on connection)
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResult);

  // 3. Create first department head
  const departmentHeadEmail1 = typia.random<string & tags.Format<"email">>();
  const departmentHeadFullName1 = RandomGenerator.name();
  const departmentHeadPhone1 = RandomGenerator.mobile();
  const create1 =
    await api.functional.healthcarePlatform.organizationAdmin.departmentheads.create(
      connection,
      {
        body: {
          email: departmentHeadEmail1,
          full_name: departmentHeadFullName1,
          phone: departmentHeadPhone1,
        } satisfies IHealthcarePlatformDepartmentHead.ICreate,
      },
    );
  typia.assert(create1);

  // 4. Update fields (change full_name, phone, and email)
  const departmentHeadEmailUpdated = typia.random<
    string & tags.Format<"email">
  >();
  const departmentHeadFullNameUpdated = RandomGenerator.name();
  const departmentHeadPhoneUpdated = RandomGenerator.mobile();

  const update1 =
    await api.functional.healthcarePlatform.organizationAdmin.departmentheads.update(
      connection,
      {
        departmentHeadId: create1.id,
        body: {
          email: departmentHeadEmailUpdated,
          full_name: departmentHeadFullNameUpdated,
          phone: departmentHeadPhoneUpdated,
        } satisfies IHealthcarePlatformDepartmentHead.IUpdate,
      },
    );
  typia.assert(update1);

  // 5. Validate that fields were updated and updated_at changed
  TestValidator.equals(
    "departmentHeadId remains unchanged after update",
    update1.id,
    create1.id,
  );
  TestValidator.equals(
    "email updated",
    update1.email,
    departmentHeadEmailUpdated,
  );
  TestValidator.equals(
    "full_name updated",
    update1.full_name,
    departmentHeadFullNameUpdated,
  );
  TestValidator.equals(
    "phone updated",
    update1.phone,
    departmentHeadPhoneUpdated,
  );
  TestValidator.notEquals(
    "updated_at is changed after update",
    update1.updated_at,
    create1.updated_at,
  );

  // 6. Negative: Attempt to update to duplicate email
  const departmentHeadEmail2 = typia.random<string & tags.Format<"email">>();
  const create2 =
    await api.functional.healthcarePlatform.organizationAdmin.departmentheads.create(
      connection,
      {
        body: {
          email: departmentHeadEmail2,
          full_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformDepartmentHead.ICreate,
      },
    );
  typia.assert(create2);

  await TestValidator.error(
    "Updating to duplicate department head email should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.departmentheads.update(
        connection,
        {
          departmentHeadId: create2.id,
          body: {
            email: departmentHeadEmailUpdated, // already-in-use email
          } satisfies IHealthcarePlatformDepartmentHead.IUpdate,
        },
      );
    },
  );

  // 7. Negative: Attempt update with invalid departmentHeadId
  const randomInvalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Updating nonexistent department head should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.departmentheads.update(
        connection,
        {
          departmentHeadId: randomInvalidId,
          body: {
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies IHealthcarePlatformDepartmentHead.IUpdate,
        },
      );
    },
  );

  // 8. Negative: Attempt update with unauthorized/unauthenticated role
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Update with unauthenticated connection should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.departmentheads.update(
        unauthConn,
        {
          departmentHeadId: create1.id,
          body: {
            full_name: RandomGenerator.name(),
          } satisfies IHealthcarePlatformDepartmentHead.IUpdate,
        },
      );
    },
  );
}
