import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Validate department head nurse detail access control and data correctness.
 *
 * This test covers access control and correctness of nurse detail retrieval via
 * department head context:
 *
 * 1. Register department head A and create a nurse within A's department.
 * 2. Retrieve this nurse profile as department head A to confirm information
 *    matches creation input.
 * 3. Register department head B (distinct department) and create a nurse under B's
 *    department.
 * 4. As department head A, attempt to access B's nurse profile (should fail;
 *    permission enforced).
 * 5. Try to access a non-existent nurseId (random UUID); expect not-found error.
 *
 * The test ensures proper enforcement of department scope—nurse details are
 * only visible to their head. Each step validates both business logic
 * (ownership and error paths) and data correctness (profile fields).
 */
export async function test_api_nurse_detail_retrieve_department_head_scope(
  connection: api.IConnection,
) {
  // 1. Register department head A
  const deptHeadA_email = typia.random<string & tags.Format<"email">>();
  const deptHeadA_password = RandomGenerator.alphaNumeric(12);
  const deptHeadA: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: deptHeadA_email,
        full_name: RandomGenerator.name(),
        password: deptHeadA_password,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  typia.assert(deptHeadA);

  // 2. Create nurse under department head A
  const nurseA_email = typia.random<string & tags.Format<"email">>();
  const nurseA_license = RandomGenerator.alphaNumeric(10);
  const nurseA_input = {
    email: nurseA_email,
    full_name: RandomGenerator.name(),
    license_number: nurseA_license,
    specialty: "ICU",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.ICreate;
  const nurseA: IHealthcarePlatformNurse =
    await api.functional.healthcarePlatform.departmentHead.nurses.create(
      connection,
      {
        body: nurseA_input,
      },
    );
  typia.assert(nurseA);

  // 3. Retrieve the nurse profile and verify all details
  const foundNurseA =
    await api.functional.healthcarePlatform.departmentHead.nurses.at(
      connection,
      {
        nurseId: nurseA.id,
      },
    );
  typia.assert(foundNurseA);
  TestValidator.equals("nurse profile: id", foundNurseA.id, nurseA.id);
  TestValidator.equals(
    "nurse profile: email",
    foundNurseA.email,
    nurseA_input.email,
  );
  TestValidator.equals(
    "nurse profile: full_name",
    foundNurseA.full_name,
    nurseA_input.full_name,
  );
  TestValidator.equals(
    "nurse profile: license_number",
    foundNurseA.license_number,
    nurseA_input.license_number,
  );
  TestValidator.equals(
    "nurse profile: specialty",
    foundNurseA.specialty,
    nurseA_input.specialty,
  );
  TestValidator.equals(
    "nurse profile: phone",
    foundNurseA.phone,
    nurseA_input.phone,
  );

  // 4. Register department head B and create nurse in another department
  const deptHeadB_email = typia.random<string & tags.Format<"email">>();
  const deptHeadB_password = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHeadB_email,
      full_name: RandomGenerator.name(),
      password: deptHeadB_password,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  // Now connection is authenticated as deptHeadB
  const nurseB_email = typia.random<string & tags.Format<"email">>();
  const nurseB_license = RandomGenerator.alphaNumeric(10);
  const nurseB_input = {
    email: nurseB_email,
    full_name: RandomGenerator.name(),
    license_number: nurseB_license,
    specialty: "Pediatrics",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.ICreate;
  const nurseB: IHealthcarePlatformNurse =
    await api.functional.healthcarePlatform.departmentHead.nurses.create(
      connection,
      {
        body: nurseB_input,
      },
    );
  typia.assert(nurseB);

  // Switch back to A
  await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHeadA_email,
      full_name: deptHeadA.full_name,
      password: deptHeadA_password,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });

  // 5. Attempt unauthorized access to nurseB (different department)
  await TestValidator.error(
    "department head cannot access nurse in another department",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.nurses.at(
        connection,
        { nurseId: nurseB.id },
      );
    },
  );

  // 6. Attempt access to a non-existent nurseId
  const randomNurseId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("404 error for non-existent nurseId", async () => {
    await api.functional.healthcarePlatform.departmentHead.nurses.at(
      connection,
      { nurseId: randomNurseId },
    );
  });
}
