import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validate patient appointment reminder creation and authorization boundaries.
 *
 * 1. Register and login patient 1
 * 2. Register and login receptionist
 * 3. Receptionist creates appointment for patient 1
 * 4. Login as patient 1 and create reminder for self (happy path)
 * 5. Register and login patient 2 (for cross-patient negative test)
 * 6. Patient 2 login: Try to create reminder for patient 1's appointment with
 *    patient 2's id as recipient (should be rejected)
 */
export async function test_api_patient_appointment_reminder_creation_as_patient(
  connection: api.IConnection,
) {
  // 1. Register and login patient 1
  const patient1_email = `patient1_${RandomGenerator.alphaNumeric(10)}@test.com`;
  const patient1_password = RandomGenerator.alphaNumeric(12);
  const patient1_join = await api.functional.auth.patient.join(connection, {
    body: {
      email: patient1_email,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1988, 5, 10).toISOString(),
      password: patient1_password,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient1_join);

  const patient1 = patient1_join;

  await api.functional.auth.patient.login(connection, {
    body: {
      email: patient1_email,
      password: patient1_password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 2. Register and login receptionist
  const receptionist_email = `recep_${RandomGenerator.alphaNumeric(10)}@test.com`;
  const receptionist_password = RandomGenerator.alphaNumeric(12);
  const receptionist_join = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionist_email as string & tags.Format<"email">,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionist_join);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionist_email as string & tags.Format<"email">,
      password: receptionist_password,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Receptionist creates appointment for patient 1
  // - org id, provider id, status id must be proper uuids (simulate with random for test)
  const org_id = typia.random<string & tags.Format<"uuid">>();
  const dept_id = typia.random<string & tags.Format<"uuid">>();
  const provider_id = typia.random<string & tags.Format<"uuid">>();
  const status_id = typia.random<string & tags.Format<"uuid">>();
  const appointment_create = {
    healthcare_platform_organization_id: org_id,
    healthcare_platform_department_id: dept_id,
    provider_id,
    patient_id: patient1.id,
    status_id,
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    room_id: typia.random<string & tags.Format<"uuid">>(),
    equipment_id: typia.random<string & tags.Format<"uuid">>(),
    recurrence_rule: null,
  } satisfies IHealthcarePlatformAppointment.ICreate;

  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointment_create },
    );
  typia.assert(appointment);

  // 4. Login as patient 1 and create reminder (happy path)
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patient1_email,
      password: patient1_password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  const reminder_request = {
    reminder_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    recipient_type: "patient",
    recipient_id: patient1.id,
    delivery_channel: RandomGenerator.pick(["sms", "email", "in_app"] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.patient.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminder_request,
      },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "created reminder has correct recipient",
    reminder.recipient_id,
    patient1.id,
  );
  TestValidator.equals(
    "created reminder appointment id matches",
    reminder.appointment_id,
    appointment.id,
  );

  // 5. Register and login patient 2
  const patient2_email = `patient2_${RandomGenerator.alphaNumeric(10)}@test.com`;
  const patient2_password = RandomGenerator.alphaNumeric(12);
  const patient2_join = await api.functional.auth.patient.join(connection, {
    body: {
      email: patient2_email,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 1, 25).toISOString(),
      password: patient2_password,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient2_join);
  const patient2 = patient2_join;

  await api.functional.auth.patient.login(connection, {
    body: {
      email: patient2_email,
      password: patient2_password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 6. Negative test: patient 2 tries to create reminder for patient 1's appointment
  const cross_reminder = {
    reminder_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    recipient_type: "patient",
    recipient_id: patient2.id, // different patient!
    delivery_channel: "sms",
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  await TestValidator.error(
    "cannot create reminder for another patient's appointment",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.reminders.create(
        connection,
        {
          appointmentId: appointment.id,
          body: cross_reminder,
        },
      );
    },
  );
}
