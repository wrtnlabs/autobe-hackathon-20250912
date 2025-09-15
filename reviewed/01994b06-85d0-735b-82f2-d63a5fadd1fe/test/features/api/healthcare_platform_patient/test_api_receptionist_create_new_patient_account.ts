import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validate receptionist onboarding a new patient through the platform, with
 * full authentication and error flows.
 *
 * 1. Register a new receptionist using unique email, full name, and phone
 *    (optional)
 * 2. Authenticate as that receptionist (using the join credentials)
 * 3. As authenticated receptionist, create a new patient by POSTing to
 *    /healthcarePlatform/receptionist/patients
 * 4. Confirm the patient creation response reflects input data (email,
 *    full_name, date_of_birth, phone)
 * 5. Attempt to create another patient with the same email (should fail
 *    validation)
 * 6. Attempt patient creation without authentication in headers (should fail)
 * 7. Authenticate as a new receptionist, then attempt to create a patient with
 *    another role's token (if possible, with explanation if not supported)
 *    Each step includes precise assertion on business logic and type
 *    safety.
 */
export async function test_api_receptionist_create_new_patient_account(
  connection: api.IConnection,
) {
  // 1. Register a new receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPassword = RandomGenerator.alphaNumeric(12);
  const receptionistJoinBody = {
    email: receptionistEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: receptionistJoinBody,
  });
  typia.assert(receptionist);
  TestValidator.equals(
    "email matches",
    receptionist.email,
    receptionistJoinBody.email,
  );
  TestValidator.equals(
    "full_name matches",
    receptionist.full_name,
    receptionistJoinBody.full_name,
  );
  if (
    receptionistJoinBody.phone !== null &&
    receptionistJoinBody.phone !== undefined
  ) {
    TestValidator.equals(
      "phone matches",
      receptionist.phone,
      receptionistJoinBody.phone,
    );
  }
  // 2. Authenticate as the registered receptionist
  const receptionistLoginBody = {
    email: receptionistEmail,
    password: receptionistPassword,
  } satisfies IHealthcarePlatformReceptionist.ILogin;
  const authedReceptionist = await api.functional.auth.receptionist.login(
    connection,
    {
      body: receptionistLoginBody,
    },
  );
  typia.assert(authedReceptionist);
  // 3. As authenticated receptionist, create a new patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientBody = {
    email: patientEmail,
    full_name: RandomGenerator.paragraph({ sentences: 2 }),
    date_of_birth: new Date("1990-01-01T00:00:00.000Z").toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const createdPatient =
    await api.functional.healthcarePlatform.receptionist.patients.create(
      connection,
      {
        body: patientBody,
      },
    );
  typia.assert(createdPatient);
  TestValidator.equals(
    "patient email matches",
    createdPatient.email,
    patientBody.email,
  );
  TestValidator.equals(
    "patient full_name matches",
    createdPatient.full_name,
    patientBody.full_name,
  );
  TestValidator.equals(
    "patient date_of_birth matches",
    createdPatient.date_of_birth,
    patientBody.date_of_birth,
  );
  if (patientBody.phone !== null && patientBody.phone !== undefined) {
    TestValidator.equals(
      "patient phone matches",
      createdPatient.phone,
      patientBody.phone,
    );
  }
  // 4. Attempt patient creation with duplicate email (should fail)
  await TestValidator.error(
    "should fail on duplicate patient email",
    async () => {
      await api.functional.healthcarePlatform.receptionist.patients.create(
        connection,
        {
          body: patientBody,
        },
      );
    },
  );
  // 5. Attempt patient creation without authentication (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("should fail without authentication", async () => {
    await api.functional.healthcarePlatform.receptionist.patients.create(
      unauthConn,
      {
        body: {
          ...patientBody,
          email: typia.random<string & tags.Format<"email">>(),
        },
      },
    );
  });
  // 6. (If different role tokens are supported, test with another role. In this context, only receptionist role exists, so this step is effectively skipped or would require more context.)
}
