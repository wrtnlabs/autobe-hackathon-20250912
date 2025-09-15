import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Test the self-registration process for a patient account using POST
 * /healthcarePlatform/patient/patients.
 *
 * Validates the following business workflow:
 *
 * 1. Register and login as a patient to obtain an authenticated session
 *    (dependencies: /auth/patient/join, /auth/patient/login).
 * 2. With valid patient credentials, attempt to register a new patient record
 *    via /healthcarePlatform/patient/patients using the API.
 * 3. Confirm that the newly created patient record is returned and matches the
 *    data submitted.
 * 4. Attempt to create a patient with a duplicate email, and confirm that
 *    error is handled (with explicit failure).
 * 5. Try to perform patient creation without any authentication to validate
 *    role/authorization enforcement.
 */
export async function test_api_patient_self_registration(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a patient, obtaining patient credentials
  const newPatientJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1995-01-15T00:00:00Z").toISOString(),
    password: "testpassword!123",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const registeredPatient = await api.functional.auth.patient.join(connection, {
    body: newPatientJoin,
  });
  typia.assert(registeredPatient);

  // 2. Login as the patient to set the JWT in the connection
  const loginResp = await api.functional.auth.patient.login(connection, {
    body: {
      email: newPatientJoin.email,
      password: newPatientJoin.password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  typia.assert(loginResp);

  // 3. Register another patient using the same authenticated connection
  const secondPatientCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1980-06-20T00:00:00Z").toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const createdPatientObj =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: secondPatientCreate,
      },
    );
  typia.assert(createdPatientObj);
  TestValidator.equals(
    "created patient email matches request",
    createdPatientObj.email,
    secondPatientCreate.email,
  );
  TestValidator.equals(
    "created patient name matches request",
    createdPatientObj.full_name,
    secondPatientCreate.full_name,
  );
  TestValidator.equals(
    "created patient date_of_birth matches request",
    createdPatientObj.date_of_birth,
    secondPatientCreate.date_of_birth,
  );
  TestValidator.equals(
    "created patient phone matches request",
    createdPatientObj.phone,
    secondPatientCreate.phone,
  );
  TestValidator.predicate(
    "newly created patient has uuid ID",
    typeof createdPatientObj.id === "string" && createdPatientObj.id.length > 0,
  );

  // 4. Validate error for duplicate email (business logic failure only)
  await TestValidator.error(
    "cannot register duplicate patient email",
    async () => {
      await api.functional.healthcarePlatform.patient.patients.create(
        connection,
        {
          body: {
            email: secondPatientCreate.email,
            full_name: RandomGenerator.name(),
            date_of_birth: new Date("2002-05-02T00:00:00Z").toISOString(),
          } satisfies IHealthcarePlatformPatient.ICreate,
        },
      );
    },
  );

  // 5. Attempt to create a patient without authentication (no JWT set)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "cannot register patient unauthenticated",
    async () => {
      await api.functional.healthcarePlatform.patient.patients.create(
        unauthConn,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            full_name: RandomGenerator.name(),
            date_of_birth: new Date("2000-12-12T00:00:00Z").toISOString(),
          } satisfies IHealthcarePlatformPatient.ICreate,
        },
      );
    },
  );
}
