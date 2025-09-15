import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validates successful receptionist creation of an appointment reminder,
 * including all authentication and appointment setup dependencies, and
 * covers error scenarios for unauthenticated access and invalid
 * references.
 *
 * Business context:
 *
 * - Receptionists need to create appointment reminders for patients or
 *   providers.
 * - Reminders must be linked to valid appointments and valid recipients on
 *   the platform.
 *
 * Steps:
 *
 * 1. Register a new receptionist (IHealthcarePlatformReceptionist.ICreate)
 *    with a fixed password for subsequent login.
 * 2. Log in as receptionist for valid authentication
 *    (IHealthcarePlatformReceptionist.ILogin) with the same password.
 * 3. Set up required appointment data
 *    (IHealthcarePlatformAppointment.ICreate), using realistic random UUIDs
 *    as organization/provider/patient ids.
 * 4. Create the appointment and assert result
 *    (IHealthcarePlatformAppointment).
 * 5. Post a reminder for this appointment, using a valid recipient_id
 *    (provider_id or patient_id from appointment) and typical values for
 *    recipient_type and delivery_channel.
 * 6. Assert the returned reminder (IHealthcarePlatformAppointmentReminder)
 *    links to the appointment and recipient, and fields match input.
 * 7. Error: Attempt to create a reminder without logging in (unauthenticated,
 *    by using an empty connection.headers).
 * 8. Error: Attempt reminder creation with an invalid appointmentId (fresh
 *    random UUID, not the existing one) and expect business error.
 * 9. Error: Attempt reminder creation with a valid appointmentId but invalid
 *    recipient_id (fresh random UUID, not patient/provider) and expect
 *    business error.
 */
export async function test_api_receptionist_appointment_reminder_creation_success(
  connection: api.IConnection,
) {
  // 1. Register receptionist - use a fixed password so login can reproduce.
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistFullName = RandomGenerator.name();
  const receptionistPhone = RandomGenerator.mobile();
  const receptionistPassword = RandomGenerator.alphaNumeric(12);

  const joinResp = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: receptionistFullName,
      phone: receptionistPhone,
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(joinResp);

  // 2. Login as receptionist (must send correct password, not token)
  const loginResp = await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword, // Fix: use actual password
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  typia.assert(loginResp);

  // Further requests after login use the auth token set on the connection

  // 3. Prepare appointment
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const startTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const appointmentBody = {
    healthcare_platform_organization_id: orgId,
    provider_id: providerId,
    patient_id: patientId,
    status_id: statusId,
    appointment_type: "in-person",
    start_time: startTime,
    end_time: endTime,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointmentBody },
    );
  typia.assert(appointment);
  TestValidator.equals(
    "appointment.organization_id",
    appointment.healthcare_platform_organization_id,
    orgId,
  );

  // 4. Create reminder for the patient (success)
  const reminderBody = {
    reminder_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    recipient_type: "patient",
    recipient_id: patientId,
    delivery_channel: "email",
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.receptionist.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderBody,
      },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder links to appointment",
    reminder.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "reminder recipient id",
    reminder.recipient_id,
    patientId,
  );
  TestValidator.equals(
    "reminder recipient type",
    reminder.recipient_type,
    "patient",
  );
  TestValidator.equals("reminder channel", reminder.delivery_channel, "email");

  // 5. Error: unauthenticated attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "reminder creation without auth fails",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.reminders.create(
        unauthConn,
        {
          appointmentId: appointment.id,
          body: reminderBody,
        },
      );
    },
  );

  // 6. Error: invalid appointmentId
  const bogusAppointmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reminder creation with invalid appointmentId fails",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.reminders.create(
        connection,
        {
          appointmentId: bogusAppointmentId,
          body: reminderBody,
        },
      );
    },
  );

  // 7. Error: invalid recipient_id (not patient nor provider on appointment)
  const bogusRecipientId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reminder creation with invalid recipient_id fails",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.reminders.create(
        connection,
        {
          appointmentId: appointment.id,
          body: {
            ...reminderBody,
            recipient_id: bogusRecipientId,
          },
        },
      );
    },
  );
}
