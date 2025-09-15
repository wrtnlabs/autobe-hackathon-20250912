import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate department head update workflow for system admin.
 *
 * 1. Register and log in as a system admin (unique business email, password).
 * 2. Create a department head with one set of attributes (A).
 * 3. Update department head's full_name and email, confirm changes return.
 * 4. Confirm "updated_at" changes and data echoes back new values.
 * 5. Negative: update with nonexistent departmentHeadId (random UUID) ⇒ error.
 * 6. Negative: attempt update when unauthenticated ⇒ error.
 * 7. Negative: Create SECOND head (B), then try to set A's email to B's ⇒ error
 *    (unique constraint). Also, try malformed email input ⇒ error.
 * 8. Set phone to null in update, verify phone is removed/reset in DB.
 */
export async function test_api_department_head_update_profile_system_admin(
  connection: api.IConnection,
) {
  // 1. Register & login as system admin
  const adminEmail = `${RandomGenerator.alphabets(8)}@company.com`;
  const adminPassword = "TestPassw0rd!";
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminJoin);

  // 2. Log in as admin to ensure proper token (should already be done, but test)
  const adminAuth = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminAuth);

  // 3. Create department head A
  const deptAEmail = `${RandomGenerator.alphabets(8)}@dept.com`;
  const deptAFullName = RandomGenerator.name(3);
  const deptAOrig =
    await api.functional.healthcarePlatform.systemAdmin.departmentheads.create(
      connection,
      {
        body: {
          email: deptAEmail,
          full_name: deptAFullName,
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(deptAOrig);

  // 4. Update department head's email & full_name
  const newEmail = `${RandomGenerator.alphabets(8)}@dept.com`;
  const newName = RandomGenerator.name(3);
  const newPhone = RandomGenerator.mobile();
  const updatePayload = {
    email: newEmail,
    full_name: newName,
    phone: newPhone,
  };
  const updatedA =
    await api.functional.healthcarePlatform.systemAdmin.departmentheads.update(
      connection,
      {
        departmentHeadId: deptAOrig.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedA);
  TestValidator.equals(
    "department head email updated",
    updatedA.email,
    newEmail,
  );
  TestValidator.equals(
    "department head full_name updated",
    updatedA.full_name,
    newName,
  );
  TestValidator.equals(
    "department head phone updated",
    updatedA.phone,
    newPhone,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedA.updated_at,
    deptAOrig.updated_at,
  );

  // 5. Negative: update with nonexistent departmentHeadId
  await TestValidator.error(
    "update non-existent department head should throw",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.update(
        connection,
        {
          departmentHeadId: typia.random<string & tags.Format<"uuid">>(),
          body: { full_name: RandomGenerator.name(2) },
        },
      );
    },
  );

  // 6. Negative: unauthenticated update (remove connection headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "update as unauthenticated user should throw",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.update(
        unauthConn,
        {
          departmentHeadId: deptAOrig.id,
          body: { full_name: "Hacker Name" },
        },
      );
    },
  );

  // 7. Negative: duplicate email
  const deptBEmail = `${RandomGenerator.alphabets(8)}@dept.com`;
  const deptB =
    await api.functional.healthcarePlatform.systemAdmin.departmentheads.create(
      connection,
      {
        body: {
          email: deptBEmail,
          full_name: RandomGenerator.name(3),
        },
      },
    );
  typia.assert(deptB);
  await TestValidator.error(
    "updating A to have B's email should throw",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.update(
        connection,
        {
          departmentHeadId: deptAOrig.id,
          body: { email: deptBEmail },
        },
      );
    },
  );
  // 8. Negative: malformed email
  await TestValidator.error(
    "update with malformed email format should throw",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.update(
        connection,
        {
          departmentHeadId: deptAOrig.id,
          body: { email: "not-a-valid-email" },
        },
      );
    },
  );
  // 9. Set phone to null, verify phone erased
  const phoneNullUpdate =
    await api.functional.healthcarePlatform.systemAdmin.departmentheads.update(
      connection,
      {
        departmentHeadId: deptAOrig.id,
        body: { phone: null },
      },
    );
  typia.assert(phoneNullUpdate);
  TestValidator.equals(
    "phone is null after update",
    phoneNullUpdate.phone,
    null,
  );
}
