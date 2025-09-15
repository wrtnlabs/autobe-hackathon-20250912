import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Receptionist updates patient profile: success and validation.
 *
 * This test covers valid and error scenarios for updating a patient profile as
 * a receptionist:
 *
 * 1. Receptionist signs up (join)
 * 2. Receptionist creates a new patient
 * 3. Receptionist updates the patient profile successfully (fields change
 *    persisted)
 * 4. Attempt update on random/nonexistent patientId (expect error)
 * 5. Attempt update with invalid field values (expect validation error)
 */
export async function test_api_receptionist_patient_profile_update_success_and_validation(
  connection: api.IConnection,
) {
  // Step 1: Receptionist join (register and authenticate)
  const receptionistEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const receptionistFullName = RandomGenerator.name();
  const receptionistPhone = RandomGenerator.mobile();
  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistEmail,
        full_name: receptionistFullName,
        phone: receptionistPhone,
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(receptionist);

  // Step 2: Receptionist creates patient
  const patientEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const patientFullName = RandomGenerator.name();
  const patientBirth = new Date(1990, 4, 20).toISOString();
  const patientPhone = RandomGenerator.mobile();
  const patientInput = {
    email: patientEmail,
    full_name: patientFullName,
    date_of_birth: patientBirth,
    phone: patientPhone,
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient: IHealthcarePlatformPatient =
    await api.functional.healthcarePlatform.receptionist.patients.create(
      connection,
      {
        body: patientInput,
      },
    );
  typia.assert(patient);
  TestValidator.equals(
    "patient creation - email",
    patient.email,
    patientInput.email,
  );
  TestValidator.equals(
    "patient creation - full_name",
    patient.full_name,
    patientInput.full_name,
  );
  TestValidator.equals(
    "patient creation - date_of_birth",
    patient.date_of_birth,
    patientInput.date_of_birth,
  );
  TestValidator.equals(
    "patient creation - phone",
    patient.phone,
    patientInput.phone,
  );

  // Step 3: Successful profile update
  const newEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const newFullName = RandomGenerator.name();
  const newBirth = new Date(1985, 2, 10).toISOString();
  const newPhone = RandomGenerator.mobile("011");
  const updatePayload = {
    email: newEmail,
    full_name: newFullName,
    date_of_birth: newBirth,
    phone: newPhone,
  } satisfies IHealthcarePlatformPatient.IUpdate;
  const updated: IHealthcarePlatformPatient =
    await api.functional.healthcarePlatform.receptionist.patients.update(
      connection,
      {
        patientId: patient.id,
        body: updatePayload,
      },
    );
  typia.assert(updated);
  TestValidator.equals("patient id is not changed", updated.id, patient.id);
  TestValidator.equals("email updated", updated.email, newEmail);
  TestValidator.equals("full_name updated", updated.full_name, newFullName);
  TestValidator.equals(
    "date_of_birth updated",
    updated.date_of_birth,
    newBirth,
  );
  TestValidator.equals("phone updated", updated.phone, newPhone);

  // Step 4: Attempt update on random/nonexistent patientId
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update non-existent patient should error",
    async () => {
      await api.functional.healthcarePlatform.receptionist.patients.update(
        connection,
        {
          patientId: randomId,
          body: updatePayload,
        },
      );
    },
  );

  // Step 5: Attempt update with invalid field values (validation error)
  // a. Invalid email (empty string, still string type)
  await TestValidator.error("empty email fails validation", async () => {
    await api.functional.healthcarePlatform.receptionist.patients.update(
      connection,
      {
        patientId: patient.id,
        body: {
          email: "",
        } satisfies IHealthcarePlatformPatient.IUpdate,
      },
    );
  });
  // b. Invalid date_of_birth (nonsense string)
  await TestValidator.error(
    "invalid date_of_birth string fails validation",
    async () => {
      await api.functional.healthcarePlatform.receptionist.patients.update(
        connection,
        {
          patientId: patient.id,
          body: {
            date_of_birth: "not-a-date-string",
          } satisfies IHealthcarePlatformPatient.IUpdate,
        },
      );
    },
  );
  // c. Invalid phone (string but doesn't match expected format, coverage purpose)
  await TestValidator.error(
    "obviously invalid phone fails validation",
    async () => {
      await api.functional.healthcarePlatform.receptionist.patients.update(
        connection,
        {
          patientId: patient.id,
          body: {
            phone: "123",
          } satisfies IHealthcarePlatformPatient.IUpdate,
        },
      );
    },
  );
}
