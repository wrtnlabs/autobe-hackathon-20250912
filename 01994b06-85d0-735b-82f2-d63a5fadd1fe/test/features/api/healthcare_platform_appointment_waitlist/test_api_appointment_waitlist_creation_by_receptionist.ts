import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * E2E test confirming receptionist adds a patient to the appointment waitlist.
 * Workflow:
 *
 * 1. Receptionist registers (unique email, full_name, phone optional)
 * 2. Receptionist logs in (email + password)
 * 3. Patient registers (unique email, full_name, date_of_birth, password)
 * 4. Receptionist creates an appointment (organization_id, provider_id, patient_id
 *    (can use patient from step 3), status_id, appointment_type, start/end
 *    time)
 * 5. Receptionist adds the patient to the waitlist for the appointment
 *    (appointmentId, patient_id)
 * 6. Assert success, then attempt a duplicate waitlist add (expect error)
 * 7. Attempt with invalid patient UUID (expect error).
 */
export async function test_api_appointment_waitlist_creation_by_receptionist(
  connection: api.IConnection,
) {
  // Step 1: Register receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistCreate = {
    email: receptionistEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: receptionistCreate,
  });
  typia.assert(receptionist);

  // Step 2: Receptionist logs in
  const receptionistLogin = {
    email: receptionistEmail,
    password: receptionistCreate.phone ?? "defaultpw12345",
  } satisfies IHealthcarePlatformReceptionist.ILogin;
  const loginResult = await api.functional.auth.receptionist.login(connection, {
    body: receptionistLogin,
  });
  typia.assert(loginResult);

  // Step 3: Register patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientCreate = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      1990 + Math.floor(Math.random() * 20),
      0,
      1,
    ).toISOString(),
    password: "strongPwd1" + RandomGenerator.alphaNumeric(4),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patient = await api.functional.auth.patient.join(connection, {
    body: patientCreate,
  });
  typia.assert(patient);

  // Step 4: Create appointment for patient
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const apptCreate = {
    healthcare_platform_organization_id: orgId,
    healthcare_platform_department_id: null,
    provider_id: providerId,
    patient_id: patient.id,
    status_id: statusId,
    room_id: null,
    equipment_id: null,
    appointment_type: "in-person",
    start_time: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1 hr from now
    end_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hr from now
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    recurrence_rule: null,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: apptCreate,
      },
    );
  typia.assert(appointment);

  // Step 5: Add patient to waitlist for appointment
  const waitlistCreate = {
    appointment_id: appointment.id,
    patient_id: patient.id,
    status: "active",
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;
  const waitlistResult =
    await api.functional.healthcarePlatform.receptionist.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: waitlistCreate,
      },
    );
  typia.assert(waitlistResult);
  TestValidator.equals(
    "waitlist appointment match",
    waitlistResult.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "waitlist patient match",
    waitlistResult.patient_id,
    patient.id,
  );
  TestValidator.equals(
    "waitlist status is active",
    waitlistResult.status,
    "active",
  );

  // Step 6: Attempt to add the same patient again (should error)
  await TestValidator.error(
    "duplicate waitlist entry should fail",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.waitlists.create(
        connection,
        {
          appointmentId: appointment.id,
          body: waitlistCreate,
        },
      );
    },
  );

  // Step 7: Attempt with a random (invalid) patient UUID (should error)
  const invalidWaitlistCreate = {
    appointment_id: appointment.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status: "active",
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;
  await TestValidator.error(
    "invalid patient for waitlist should fail",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.waitlists.create(
        connection,
        {
          appointmentId: appointment.id,
          body: invalidWaitlistCreate,
        },
      );
    },
  );
}
