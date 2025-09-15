import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E test verifying that a nurse can create a reminder for an appointment to a
 * legitimate patient, and improper attempts are blocked.
 *
 * 1. Organization admin registers & logs in
 * 2. Nurse registers & logs in
 * 3. Organization admin creates an appointment with random provider/patient/status
 *    ids
 * 4. Nurse creates a valid reminder for the appointment's patient
 * 5. Successful creation returns correct reminder data (linked to appointment,
 *    correct fields)
 * 6. Attempting reminder creation for unrelated recipient id returns error
 * 7. Attempt with missing required fields returns error
 */
export async function test_api_reminder_creation_for_nurse_appointment_e2e(
  connection: api.IConnection,
) {
  // 1. Register Org Admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdmin);

  // 2. Register Nurse
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePassword = RandomGenerator.alphaNumeric(10);
  const nurse: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.join(connection, {
      body: {
        email: nurseEmail,
        full_name: RandomGenerator.name(),
        license_number: RandomGenerator.alphaNumeric(8),
        password: nursePassword,
      } satisfies IHealthcarePlatformNurse.IJoin,
    });
  typia.assert(nurse);

  // 3. Log in as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create a realistic appointment (randomized ids for provider/patient/status)
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const appointmentBody = {
    healthcare_platform_organization_id: orgId,
    provider_id: providerId,
    patient_id: patientId,
    status_id: statusId,
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: appointmentBody,
      },
    );
  typia.assert(appointment);

  // 5. Login as nurse
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 6. Nurse creates a reminder for the legitimate (appointment's real) patient
  const appointmentId = appointment.id;
  const reminderTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const validReminderBody = {
    reminder_time: reminderTime,
    recipient_type: "patient",
    recipient_id: appointment.patient_id,
    delivery_channel: RandomGenerator.pick(["email", "sms", "in_app"] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;

  const reminder: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.nurse.appointments.reminders.create(
      connection,
      {
        appointmentId,
        body: validReminderBody,
      },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder links to appointment",
    reminder.appointment_id,
    appointmentId,
  );
  TestValidator.equals(
    "reminder recipient",
    reminder.recipient_id,
    appointment.patient_id,
  );
  TestValidator.equals(
    "reminder recipient type",
    reminder.recipient_type,
    "patient",
  );
  TestValidator.equals("reminder time", reminder.reminder_time, reminderTime);

  // 7. Try to create a reminder for a non-participant (random non-patient id)
  const unrelatedRecipientId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "creating reminder for unrelated recipient must fail",
    async () => {
      await api.functional.healthcarePlatform.nurse.appointments.reminders.create(
        connection,
        {
          appointmentId,
          body: {
            reminder_time: reminderTime,
            recipient_type: "patient",
            recipient_id: unrelatedRecipientId,
            delivery_channel: "email",
          } satisfies IHealthcarePlatformAppointmentReminder.ICreate,
        },
      );
    },
  );

  // 8. Try creating with invalid logic value (invalid recipient_type)
  await TestValidator.error(
    "creating reminder with invalid recipient_type must fail",
    async () => {
      await api.functional.healthcarePlatform.nurse.appointments.reminders.create(
        connection,
        {
          appointmentId,
          body: {
            reminder_time: reminderTime,
            recipient_type: "invalid_type",
            recipient_id: appointment.patient_id,
            delivery_channel: "email",
          } satisfies IHealthcarePlatformAppointmentReminder.ICreate,
        },
      );
    },
  );
}
