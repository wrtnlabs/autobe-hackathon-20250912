import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Technician successfully retrieves full appointment reminder details for an
 * appointment they are assigned to
 *
 * - 1. Create (join) technician with business email and required information
 * - 2. Technician logs in
 * - 3. Receptionist creates account (join) and logs in
 * - 4. Receptionist creates appointment (all UUID fields given via typia.random;
 *        technician is assigned as provider)
 * - 5. System admin creates account and logs in
 * - 6. System admin creates a reminder for the technician (recipient_id =
 *        technician.id, type = 'provider', delivery_channel random)
 * - 7. Switch to technician account (login) and fetch reminder via GET
 *        /healthcarePlatform/technician/appointments/{appointmentId}/reminders/{reminderId}
 * - 8. Assert the returned details (recipient, recipient type, appointment ID, etc)
 *        match prior state
 * - 9. Validate full type and structural output
 */
export async function test_api_reminder_detail_technician_role_valid(
  connection: api.IConnection,
) {
  // 1. Technician registration and join
  const techEmail: string = typia.random<string & tags.Format<"email">>();
  const techJoin = {
    email: techEmail,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    specialty: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformTechnician.IJoin;
  const techRes: IHealthcarePlatformTechnician.IAuthorized =
    await api.functional.auth.technician.join(connection, { body: techJoin });
  typia.assert(techRes);

  // 2. Technician login (obtain token)
  const techPwd: string = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.technician.login(connection, {
    body: {
      email: techJoin.email,
      password: techPwd,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 3. Receptionist join/login
  const recEmail: string = typia.random<string & tags.Format<"email">>();
  const recJoin = {
    email: recEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const recRes: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, { body: recJoin });
  typia.assert(recRes);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: recJoin.email,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 4. Receptionist creates appointment (provider assigned to technician)
  const organization_id = typia.random<string & tags.Format<"uuid">>();
  const patient_id = typia.random<string & tags.Format<"uuid">>();
  const status_id = typia.random<string & tags.Format<"uuid">>();
  const appointmentCreate = {
    healthcare_platform_organization_id: organization_id,
    provider_id: techRes.id,
    patient_id,
    status_id,
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    title: "Test Appointment",
    description: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointmentCreate },
    );
  typia.assert(appointment);

  // 5. System admin join/login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoin = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminRes: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: adminJoin });
  typia.assert(adminRes);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminJoin.email,
      provider: "local",
      provider_key: adminJoin.email,
      password: adminJoin.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 6. System admin creates reminder (recipient: technician, recipient_type: provider)
  const reminderBody = {
    reminder_time: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
    recipient_type: "provider",
    recipient_id: techRes.id,
    delivery_channel: RandomGenerator.pick(["email", "sms", "in_app"] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.create(
      connection,
      { appointmentId: appointment.id, body: reminderBody },
    );
  typia.assert(reminder);

  // 7. Switch to technician and login for access
  await api.functional.auth.technician.login(connection, {
    body: {
      email: techJoin.email,
      password: techPwd,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 8. Fetch the reminder via GET /healthcarePlatform/technician/appointments/{appointmentId}/reminders/{reminderId}
  const fetched: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.technician.appointments.reminders.at(
      connection,
      { appointmentId: appointment.id, reminderId: reminder.id },
    );
  typia.assert(fetched);
  // 9. Assertions
  TestValidator.equals("reminder id", fetched.id, reminder.id);
  TestValidator.equals(
    "appointment id",
    fetched.appointment_id,
    appointment.id,
  );
  TestValidator.equals("recipient id", fetched.recipient_id, techRes.id);
  TestValidator.equals("recipient type", fetched.recipient_type, "provider");
  TestValidator.equals(
    "delivery channel",
    fetched.delivery_channel,
    reminderBody.delivery_channel,
  );
}
