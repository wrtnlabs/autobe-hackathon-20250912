import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Validate that a patient can self-register, create their profile, and update
 * their own profile through the patient-facing API endpoint. Test that updates
 * are reflected, and unauthorized or invalid update attempts are properly
 * rejected.
 *
 * Steps:
 *
 * 1. Register a patient using /auth/patient/join (with email, name, date_of_birth,
 *    phone, password)
 * 2. Create a patient profile via POST /healthcarePlatform/patient/patients (with
 *    same identity and phone)
 * 3. Update the patient profile via PUT
 *    /healthcarePlatform/patient/patients/{patientId} with valid changed data
 *    and verify profile is updated
 * 4. Attempt an invalid profile update (bad email or empty name) and verify error
 *    is returned
 * 5. Attempt to update a profile not owned by the current patient and verify
 *    forbidden
 */
export async function test_api_patient_self_update_profile_and_permissions(
  connection: api.IConnection,
) {
  // 1. Register a new patient
  const patientJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1989-11-21T00:00:00Z").toISOString() as string &
      tags.Format<"date-time">,
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const authorized = await api.functional.auth.patient.join(connection, {
    body: patientJoin,
  });
  typia.assert(authorized);

  // 2. Create patient profile
  const patientCreate = {
    email: patientJoin.email as string & tags.Format<"email">,
    full_name: patientJoin.full_name,
    date_of_birth: patientJoin.date_of_birth,
    phone: patientJoin.phone,
  } satisfies IHealthcarePlatformPatient.ICreate;
  const created =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: patientCreate,
      },
    );
  typia.assert(created);
  TestValidator.equals("patient id consists", authorized.id, created.id);

  // 3. Update own profile with valid changes
  const updateProfile = {
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.patient.patients.update(
      connection,
      {
        patientId: created.id,
        body: updateProfile,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "patient id does not change on update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "profile full_name updated",
    updated.full_name,
    updateProfile.full_name,
  );
  TestValidator.equals(
    "profile phone updated",
    updated.phone,
    updateProfile.phone,
  );

  // 4. Attempt to update profile with invalid email
  await TestValidator.error("invalid email format should fail", async () => {
    await api.functional.healthcarePlatform.patient.patients.update(
      connection,
      {
        patientId: created.id,
        body: {
          email: "INVALIDEMAIL",
        } satisfies IHealthcarePlatformPatient.IUpdate,
      },
    );
  });

  // 4. Attempt to update profile with empty name
  await TestValidator.error("empty full_name should fail", async () => {
    await api.functional.healthcarePlatform.patient.patients.update(
      connection,
      {
        patientId: created.id,
        body: {
          full_name: "",
        } satisfies IHealthcarePlatformPatient.IUpdate,
      },
    );
  });

  // 5. Create a second patient and try to update first patient's profile
  const patientJoin2 = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1991-02-28T00:00:00Z").toISOString() as string &
      tags.Format<"date-time">,
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformPatient.IJoin;
  await api.functional.auth.patient.join(connection, {
    body: patientJoin2,
  });

  // Context is now as patient2
  await TestValidator.error(
    "cannot update another patient's profile",
    async () => {
      await api.functional.healthcarePlatform.patient.patients.update(
        connection,
        {
          patientId: created.id,
          body: {
            full_name: RandomGenerator.name(),
          } satisfies IHealthcarePlatformPatient.IUpdate,
        },
      );
    },
  );

  // 6. Attempt to update a non-existent patientId
  await TestValidator.error("non-existent patientId should fail", async () => {
    await api.functional.healthcarePlatform.patient.patients.update(
      connection,
      {
        patientId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          full_name: RandomGenerator.name(),
        } satisfies IHealthcarePlatformPatient.IUpdate,
      },
    );
  });
}
