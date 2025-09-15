import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that system admins can create new department heads with all
 * valid/invalid cases
 *
 * 1. Register and login as system admin; get admin authorization
 * 2. Create department head - valid data, expect success, check output
 * 3. Duplicate email create - expect error (unique constraint)
 * 4. Create with missing/invalid/edge fields - expect error/allowance accordingly
 * 5. Try without authentication/insufficient privileges - expect rejection
 */
export async function test_api_department_head_creation_valid_system_admin(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@corp-test.com`;
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Login as system admin (demonstrate login, not strictly necessary since join auto logins, but explicit for flow)
  const loginBody = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminAuth2 = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(adminAuth2);

  // 3. Create department head with valid unique fields
  const dhEmail = `depthead_${RandomGenerator.alphaNumeric(8)}@dept-test.com`;
  const createBody = {
    email: dhEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.ICreate;
  const head =
    await api.functional.healthcarePlatform.systemAdmin.departmentheads.create(
      connection,
      { body: createBody },
    );
  typia.assert(head);
  TestValidator.equals(
    "department head email matches input",
    head.email,
    createBody.email,
  );
  TestValidator.equals(
    "department head name matches input",
    head.full_name,
    createBody.full_name,
  );
  TestValidator.equals(
    "department head phone matches input",
    head.phone,
    createBody.phone,
  );
  TestValidator.equals(
    "department head not soft-deleted",
    head.deleted_at,
    null,
  );

  // 4. Attempt duplicate creation by email (unique constraint error)
  await TestValidator.error(
    "department head duplicate email create should fail",
    async () =>
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.create(
        connection,
        { body: createBody },
      ),
  );

  // 5. Valid variations: missing/nullable phone
  const dhEmail2 = `depthead2_${RandomGenerator.alphaNumeric(8)}@dept-test.com`;
  const bodyNoPhone = {
    email: dhEmail2,
    full_name: RandomGenerator.name(),
  } satisfies IHealthcarePlatformDepartmentHead.ICreate;
  const headNoPhone =
    await api.functional.healthcarePlatform.systemAdmin.departmentheads.create(
      connection,
      { body: bodyNoPhone },
    );
  typia.assert(headNoPhone);
  TestValidator.equals("second head email", headNoPhone.email, dhEmail2);
  TestValidator.equals("second head phone is null", headNoPhone.phone, null);

  const dhEmail3 = `depthead3_${RandomGenerator.alphaNumeric(8)}@dept-test.com`;
  const bodyNullPhone = {
    email: dhEmail3,
    full_name: RandomGenerator.name(),
    phone: null,
  } satisfies IHealthcarePlatformDepartmentHead.ICreate;
  const headNullPhone =
    await api.functional.healthcarePlatform.systemAdmin.departmentheads.create(
      connection,
      { body: bodyNullPhone },
    );
  typia.assert(headNullPhone);
  TestValidator.equals("third head email", headNullPhone.email, dhEmail3);
  TestValidator.equals("third head phone is null", headNullPhone.phone, null);

  // 6. Attempt without admin context (should fail due to authorization)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "department head create without admin should fail",
    async () =>
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.create(
        unauthConn,
        { body: createBody },
      ),
  );
}
