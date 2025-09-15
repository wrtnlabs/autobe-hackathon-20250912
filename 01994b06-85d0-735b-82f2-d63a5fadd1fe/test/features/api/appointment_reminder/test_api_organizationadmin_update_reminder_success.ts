import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test the successful update of an appointment reminder as an organization
 * admin.
 *
 * 1. Register a new organization admin (POST /auth/organizationAdmin/join)
 * 2. Login as organization admin (POST /auth/organizationAdmin/login)
 * 3. Simulate creation of an appointment (generate appointmentId: uuid)
 * 4. Simulate creation of a reminder (generate reminderId and recipient_id: uuid)
 * 5. Send an update (PUT
 *    /healthcarePlatform/organizationAdmin/appointments/{appointmentId}/reminders/{reminderId})
 *
 *    - Change reminder_time, delivery_channel, delivery_status, recipient_type
 * 6. Validate the returned reminder entity (type + property checks)
 */
export async function test_api_organizationadmin_update_reminder_success(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    password: adminPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const joinResult = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert(joinResult);
  TestValidator.equals(
    "organization admin email",
    joinResult.email,
    adminEmail,
  );

  // 2. Login as organization admin (to confirm valid JWT, simulate real login)
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResult);
  TestValidator.equals(
    "login email matches join email",
    loginResult.email,
    adminEmail,
  );

  // 3. Simulate creation of appointment
  const appointmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Simulate creation of a reminder (with a recipient_id)
  const reminderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const recipientId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 5. Send update: change reminder_time & delivery_status
  const newReminderTime = new Date(Date.now() + 3600_000).toISOString();
  const updateBody = {
    reminder_time: newReminderTime,
    delivery_status: "sent",
    recipient_id: recipientId,
    delivery_channel: RandomGenerator.pick(["email", "sms", "in_app"] as const),
    recipient_type: RandomGenerator.pick([
      "patient",
      "provider",
      "both",
    ] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.IUpdate;

  const updated: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.update(
      connection,
      {
        appointmentId,
        reminderId,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 6. Validate some business properties
  TestValidator.equals("updated reminder id matches", updated.id, reminderId);
  TestValidator.equals(
    "updated appointment id matches",
    updated.appointment_id,
    appointmentId,
  );
  TestValidator.equals(
    "updated reminder time matches",
    updated.reminder_time,
    newReminderTime,
  );
  TestValidator.equals(
    "updated delivery_status matches",
    updated.delivery_status,
    updateBody.delivery_status,
  );
  TestValidator.equals(
    "updated recipient_id matches",
    updated.recipient_id,
    updateBody.recipient_id,
  );
  TestValidator.equals(
    "updated delivery_channel matches",
    updated.delivery_channel,
    updateBody.delivery_channel,
  );
  TestValidator.equals(
    "updated recipient_type matches",
    updated.recipient_type,
    updateBody.recipient_type,
  );
}
