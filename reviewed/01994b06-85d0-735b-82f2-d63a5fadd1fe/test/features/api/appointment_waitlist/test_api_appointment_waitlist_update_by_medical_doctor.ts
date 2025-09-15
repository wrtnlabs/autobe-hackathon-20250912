import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";

/**
 * Medical doctor updates an appointment waitlist entry under their purview
 *
 * Steps and Validations:
 *
 * 1. Register a medical doctor with unique email/npi, log in to get session
 * 2. The doctor creates an appointment (dummy
 *    org/department/providers/patient/status)
 * 3. The doctor creates a waitlist entry on the appointment (with a random
 *    patient_id)
 * 4. The doctor updates the waitlist entry (status change and optional join_time
 *    update)
 *
 *    - Assert fields actually update (status, join_time)
 *    - Assert immutable fields cannot be changed
 *    - Assert error when using invalid (random) appointmentId/waitlistId
 *    - Assert permission error if trying to update waitlist for non-owned
 *         appointment
 */
export async function test_api_appointment_waitlist_update_by_medical_doctor(
  connection: api.IConnection,
) {
  // 1. Register doctor and login
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: joinInput,
  });
  typia.assert(doctor);
  const doctorToken = doctor.token.access;

  // 2. Doctor creates an appointment (simulate org/department/patient/status uuids, self as provider)
  const appointmentInput = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    healthcare_platform_department_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: doctor.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
      connection,
      { body: appointmentInput },
    );
  typia.assert(appointment);

  // 3. Create waitlist entry on that appointment
  const waitlistInput = {
    appointment_id: appointment.id,
    patient_id: appointment.patient_id,
    join_time: new Date().toISOString(),
    status: "active",
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;
  const waitlist =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: waitlistInput,
      },
    );
  typia.assert(waitlist);

  // Save values for update
  const originalJoinTime = waitlist.join_time;

  // 4. Update the waitlist entry (status change and update join_time)
  const updateInput = {
    status: "promoted",
    join_time: new Date(Date.now() + 60000).toISOString(),
  } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.update(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "waitlist status updated",
    updated.status,
    updateInput.status,
  );
  TestValidator.notEquals(
    "waitlist join_time updated",
    updated.join_time,
    originalJoinTime,
  );
  TestValidator.equals(
    "waitlist patient_id is unchanged",
    updated.patient_id,
    waitlist.patient_id,
  );

  // Error: Invalid appointmentId/waitlistId
  await TestValidator.error("error on invalid appointmentId", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.update(
      connection,
      {
        appointmentId: typia.random<string & tags.Format<"uuid">>(),
        waitlistId: waitlist.id,
        body: updateInput,
      },
    );
  });

  await TestValidator.error("error on invalid waitlistId", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.update(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: typia.random<string & tags.Format<"uuid">>(),
        body: updateInput,
      },
    );
  });

  // Permission boundary: simulate by logging in as new doctor and trying to update this waitlist
  const otherDocInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const otherDoctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: otherDocInput,
  });
  typia.assert(otherDoctor);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: otherDocInput.email,
      password: otherDocInput.password,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await TestValidator.error(
    "doctor cannot update other doctor's waitlist",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.update(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: waitlist.id,
          body: updateInput,
        },
      );
    },
  );
}
