import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Patient retrieves their appointment reminder details, validating visibility
 * and information scope.
 *
 * 1. Register and login patient account, save patientId.
 * 2. Register and login receptionist account.
 * 3. Receptionist creates appointment for patient (uses patientId).
 * 4. Register and login system admin account.
 * 5. System admin creates reminder for this appointment, targeting patient as
 *    recipient.
 * 6. Switch session to patient (login as patient).
 * 7. Patient fetches reminder details using GET, validate all returned fields and
 *    business visibility.
 */
export async function test_api_reminder_detail_patient_role_valid(
  connection: api.IConnection,
) {
  // 1. Register and login patient
  const patientEmail = RandomGenerator.alphaNumeric(16) + "@example.com";
  const patientPassword = RandomGenerator.alphaNumeric(20);
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1995, 10, 23).toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    },
  });
  typia.assert(patientJoin);
  const patientId = patientJoin.id;

  // Fresh unauthenticated connection for context switching
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Register receptionist (login isn't needed to create appointment after join)
  const receptionistEmail = RandomGenerator.alphaNumeric(16) + "@example.com";
  const receptionistJoin = await api.functional.auth.receptionist.join(
    unauthConn,
    {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(receptionistJoin);

  // 3. Receptionist creates appointment for patient
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const appointmentStart = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString(); // tomorrow
  const appointmentEnd = new Date(
    Date.now() + 25 * 60 * 60 * 1000,
  ).toISOString(); // one hour after
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      unauthConn,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          provider_id: providerId,
          patient_id: patientId,
          status_id: statusId,
          appointment_type: "in-person",
          start_time: appointmentStart,
          end_time: appointmentEnd,
        },
      },
    );
  typia.assert(appointment);
  const appointmentId = appointment.id;

  // 4. Register and login system admin
  const adminEmail = RandomGenerator.alphaNumeric(18) + "@business.com";
  const adminPassword = RandomGenerator.alphaNumeric(20);
  const adminJoin = await api.functional.auth.systemAdmin.join(unauthConn, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminJoin);
  await api.functional.auth.systemAdmin.login(unauthConn, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });

  // 5. System admin creates reminder for appointment
  const reminderTime = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  const deliveryChannel = RandomGenerator.pick([
    "email",
    "sms",
    "in_app",
  ] as const);
  const reminder =
    await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.create(
      unauthConn,
      {
        appointmentId,
        body: {
          reminder_time: reminderTime,
          recipient_type: "patient",
          recipient_id: patientId,
          delivery_channel: deliveryChannel,
        },
      },
    );
  typia.assert(reminder);
  const reminderId = reminder.id;

  // 6. Switch session to patient (login as patient)
  await api.functional.auth.patient.login(unauthConn, {
    body: {
      email: patientEmail,
      password: patientPassword,
    },
  });

  // 7. Patient fetches the reminder details
  const output =
    await api.functional.healthcarePlatform.patient.appointments.reminders.at(
      unauthConn,
      {
        appointmentId,
        reminderId,
      },
    );
  typia.assert(output);
  TestValidator.equals("reminder id matches", output.id, reminderId);
  TestValidator.equals(
    "appointment id matches",
    output.appointment_id,
    appointmentId,
  );
  TestValidator.equals(
    "reminder recipient id matches patient",
    output.recipient_id,
    patientId,
  );
  TestValidator.equals(
    "reminder recipient type is patient",
    output.recipient_type,
    "patient",
  );
  TestValidator.equals(
    "reminder delivery channel matches",
    output.delivery_channel,
    deliveryChannel,
  );
}
