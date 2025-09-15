import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Validates that department heads can register new nurses via departmentHead
 * context. Steps:
 *
 * 1. Register and authenticate a department head (unique email)
 * 2. Using this authenticated context, create a nurse (unique email, license
 *    number)
 * 3. Validate success: returned nurse profile fields match
 * 4. Attempt to create a nurse with duplicate email or license number (should
 *    fail)
 */
export async function test_api_nurse_creation_by_department_head(
  connection: api.IConnection,
) {
  // 1. Register department head
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadJoin = {
    email: deptHeadEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const departmentHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: deptHeadJoin,
    });
  typia.assert(departmentHead);

  // 2. Create nurse profile
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nurseLicense = RandomGenerator.alphaNumeric(10);
  const nurseCreate = {
    email: nurseEmail,
    full_name: RandomGenerator.name(),
    license_number: nurseLicense,
    specialty: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 8,
    }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.ICreate;
  const nurseProfile: IHealthcarePlatformNurse =
    await api.functional.healthcarePlatform.departmentHead.nurses.create(
      connection,
      { body: nurseCreate },
    );
  typia.assert(nurseProfile);
  TestValidator.equals(
    "Nurse email matches",
    nurseProfile.email,
    nurseCreate.email,
  );
  TestValidator.equals(
    "Nurse license matches",
    nurseProfile.license_number,
    nurseCreate.license_number,
  );
  TestValidator.equals(
    "Nurse full name matches",
    nurseProfile.full_name,
    nurseCreate.full_name,
  );
  TestValidator.equals(
    "Specialty matches",
    nurseProfile.specialty,
    nurseCreate.specialty,
  );
  TestValidator.equals("Phone matches", nurseProfile.phone, nurseCreate.phone);

  // 3. Attempt nurse with duplicate email
  const nurseDuplicateEmail = {
    email: nurseCreate.email,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformNurse.ICreate;
  await TestValidator.error("Duplicate nurse email should fail", async () => {
    await api.functional.healthcarePlatform.departmentHead.nurses.create(
      connection,
      { body: nurseDuplicateEmail },
    );
  });

  // 4. Attempt nurse with duplicate license_number
  const nurseDuplicateLicense = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: nurseCreate.license_number,
  } satisfies IHealthcarePlatformNurse.ICreate;
  await TestValidator.error(
    "Duplicate nurse license_number should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.nurses.create(
        connection,
        { body: nurseDuplicateLicense },
      );
    },
  );
}
