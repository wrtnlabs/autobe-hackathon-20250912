import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Validates department head's ability to update nurse staff profiles in their
 * department via department head permissions.
 *
 * Test covers:
 *
 * 1. Register and authenticate a department head
 * 2. Department head creates a nurse staff member for managed department
 * 3. Department head performs valid updates (phone, specialty, full_name) and
 *    confirms each update is reflected in nurse record
 * 4. Attempting update on non-existent/deleted nurseId triggers an error
 * 5. Ensures only fields allowed by IHealthcarePlatformNurse.IUpdate are
 *    modifiable
 * 6. All responses are validated for type correctness and business logic.
 */
export async function test_api_nurse_update_by_department_head(
  connection: api.IConnection,
) {
  // 1. Register department head
  const dhEmail = typia.random<string & tags.Format<"email">>();
  const departmentHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: dhEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(10),
        sso_provider: undefined,
        sso_provider_key: undefined,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  typia.assert(departmentHead);

  // 2. Create nurse
  const createNurseBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    specialty: "ICU",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.ICreate;
  const nurse: IHealthcarePlatformNurse =
    await api.functional.healthcarePlatform.departmentHead.nurses.create(
      connection,
      { body: createNurseBody },
    );
  typia.assert(nurse);

  // 3a. Valid update: change phone and specialty
  const newPhone = RandomGenerator.mobile();
  const newSpecialty = "Pediatrics";
  const updateRes1: IHealthcarePlatformNurse =
    await api.functional.healthcarePlatform.departmentHead.nurses.update(
      connection,
      {
        nurseId: nurse.id,
        body: {
          phone: newPhone,
          specialty: newSpecialty,
        } satisfies IHealthcarePlatformNurse.IUpdate,
      },
    );
  typia.assert(updateRes1);
  TestValidator.equals("updated phone", updateRes1.phone, newPhone);
  TestValidator.equals("updated specialty", updateRes1.specialty, newSpecialty);
  TestValidator.equals("nurse id unchanged", updateRes1.id, nurse.id);

  // 3b. Valid update: full name
  const newName = RandomGenerator.name();
  const updateRes2: IHealthcarePlatformNurse =
    await api.functional.healthcarePlatform.departmentHead.nurses.update(
      connection,
      {
        nurseId: nurse.id,
        body: { full_name: newName } satisfies IHealthcarePlatformNurse.IUpdate,
      },
    );
  typia.assert(updateRes2);
  TestValidator.equals("updated name", updateRes2.full_name, newName);

  // 4. Attempt to update a non-existent/deleted nurse
  await TestValidator.error(
    "update non-existent nurseId should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.nurses.update(
        connection,
        {
          nurseId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            full_name: RandomGenerator.name(),
          } satisfies IHealthcarePlatformNurse.IUpdate,
        },
      );
    },
  );
}
