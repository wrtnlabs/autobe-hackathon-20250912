import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * E2E scenario for a nurse user viewing a single patient profile.
 *
 * 1. Nurse registration (join; valid business email)
 * 2. Nurse login (ensure session and ability to fetch patients)
 * 3. Patient registration (join; provide patient information)
 * 4. Nurse fetches the new patient profile (GET)
 * 5. Validate response matches patient registration data (bio fields, not tokens)
 * 6. Error: Fetch with invalid patientId (random UUID not belonging to any
 *    patient)
 * 7. Error: Try fetching profile with unauthenticated context (guest; must be
 *    unauthorized)
 */
export async function test_api_nurse_patient_profile_access(
  connection: api.IConnection,
) {
  // Step 1: Nurse registration with business email
  const nurseEmail: string = `${RandomGenerator.alphabets(8)}@hospital-system.com`;
  const nurseLicense: string = RandomGenerator.alphaNumeric(10);
  const nursePassword: string = RandomGenerator.alphaNumeric(12);
  const nurseJoinBody = {
    email: nurseEmail,
    full_name: RandomGenerator.name(),
    license_number: nurseLicense,
    password: nursePassword,
    phone: RandomGenerator.mobile(),
    specialty: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.join(connection, { body: nurseJoinBody });
  typia.assert(nurse);
  TestValidator.equals(
    "nurse email matches registration",
    nurse.email,
    nurseEmail,
  );
  TestValidator.equals(
    "nurse license matches registration",
    nurse.license_number,
    nurseLicense,
  );

  // Step 2: Nurse login
  const loginResponse: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.login(connection, {
      body: {
        email: nurseEmail,
        password: nursePassword,
      } satisfies IHealthcarePlatformNurse.ILogin,
    });
  typia.assert(loginResponse);
  TestValidator.equals(
    "nurse login returns token",
    typeof loginResponse.token.access,
    "string",
  );

  // Step 3: Patient registration
  const patientEmail: string = `${RandomGenerator.alphabets(8)}@patient.com`;
  const patientPassword: string = RandomGenerator.alphaNumeric(12);
  const dob: string = new Date(
    Date.now() - 25 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const patientJoinBody = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: dob,
    phone: RandomGenerator.mobile(),
    password: patientPassword,
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patient: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, {
      body: patientJoinBody,
    });
  typia.assert(patient);
  TestValidator.equals("patient email matches", patient.email, patientEmail);
  TestValidator.equals("dob matches", patient.date_of_birth, dob);

  // Step 4: Nurse fetches correct patient profile
  const profile: IHealthcarePlatformPatient =
    await api.functional.healthcarePlatform.nurse.patients.at(connection, {
      patientId: patient.id,
    });
  typia.assert(profile);
  TestValidator.equals(
    "patient id in fetched profile is correct",
    profile.id,
    patient.id,
  );
  TestValidator.equals(
    "patient email matches registration",
    profile.email,
    patientEmail,
  );
  TestValidator.equals(
    "dob in patient profile matches registration",
    profile.date_of_birth,
    dob,
  );
  TestValidator.equals(
    "patient name in profile matches registration",
    profile.full_name,
    patient.full_name,
  );

  // Step 5: Error - Fetch with invalid patientId
  const fakeUUID: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should not find non-existent patientId",
    async () => {
      await api.functional.healthcarePlatform.nurse.patients.at(connection, {
        patientId: fakeUUID,
      });
    },
  );

  // Step 6: Error - Nurse logged out; Unauthenticated request
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated nurse cannot access patient profile",
    async () => {
      await api.functional.healthcarePlatform.nurse.patients.at(unauthConn, {
        patientId: patient.id,
      });
    },
  );
}
