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
 * Validate E2E nurse access to appointment reminder, with cross-role workflow
 * and access boundaries.
 *
 * 1. Register org-admin and nurse; login as both
 * 2. Org-admin creates appointment (with nurse as provider and self as patient)
 * 3. Org-admin creates reminder on appointment for nurse
 * 4. Nurse accesses own reminder - success
 * 5. Negative: New org-admin (other org), creates new appointment & reminder;
 *    nurse tries access - forbidden
 */
export async function test_api_appointment_reminder_nurse_access(
  connection: api.IConnection,
) {
  // Step 1: Register and login organization admin (AdminA) and nurse
  const orgAdminA_email = typia.random<string & tags.Format<"email">>();
  const orgAdminA_password = "AdminA1!2@3#";
  const orgAdminA = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminA_email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminA_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminA);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminA_email,
      password: orgAdminA_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  }); // Sets auth context

  const nurse_email = typia.random<string & tags.Format<"email">>();
  const nurse_license = RandomGenerator.alphaNumeric(8).toUpperCase();
  const nurse_password = "NursePW1@";
  const nurse_full_name = RandomGenerator.name();
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurse_email,
      full_name: nurse_full_name,
      license_number: nurse_license,
      specialty: "ICU",
      phone: RandomGenerator.mobile(),
      password: nurse_password,
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurse);

  // Step 2: Org-admin creates appointment
  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgAdminA.id,
          healthcare_platform_department_id: undefined,
          provider_id: nurse.id,
          patient_id: orgAdminA.id, // Use admin as dummy patient
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          recurrence_rule: null,
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // Step 3: Org-admin creates reminder for nurse provider
  const reminder =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          reminder_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          recipient_type: "provider",
          recipient_id: nurse.id,
          delivery_channel: "email",
        } satisfies IHealthcarePlatformAppointmentReminder.ICreate,
      },
    );
  typia.assert(reminder);

  // Step 4: Nurse session - login
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse_email,
      password: nurse_password,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // Nurse fetches valid reminder (should succeed)
  const reminderFromNurse =
    await api.functional.healthcarePlatform.nurse.appointments.reminders.at(
      connection,
      {
        appointmentId: appointment.id,
        reminderId: reminder.id,
      },
    );
  typia.assert(reminderFromNurse);
  TestValidator.equals(
    "nurse sees their provider reminder",
    reminderFromNurse.id,
    reminder.id,
  );
  TestValidator.equals(
    "appointment id matches",
    reminderFromNurse.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "recipient id is nurse",
    reminderFromNurse.recipient_id,
    nurse.id,
  );

  // Step 5: Negative - new org-admin, new appointment, new reminder (diff org)
  const orgAdminB_email = typia.random<string & tags.Format<"email">>();
  const orgAdminB_password = "AdminB1!2@3#";
  const orgAdminB = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminB_email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminB_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminB);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminB_email,
      password: orgAdminB_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  const appointmentB =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgAdminB.id,
          healthcare_platform_department_id: undefined,
          provider_id: nurse.id, // same nurse
          patient_id: orgAdminB.id,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          recurrence_rule: null,
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointmentB);

  const reminderB =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.create(
      connection,
      {
        appointmentId: appointmentB.id,
        body: {
          reminder_time: new Date(
            Date.now() + 2.5 * 60 * 60 * 1000,
          ).toISOString(),
          recipient_type: "provider",
          recipient_id: nurse.id,
          delivery_channel: "sms",
        } satisfies IHealthcarePlatformAppointmentReminder.ICreate,
      },
    );
  typia.assert(reminderB);

  // Re-authenticate as nurse
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse_email,
      password: nurse_password,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  // Nurse tries to fetch reminder from different org (should fail)
  await TestValidator.error(
    "nurse cannot see reminder from another org-admin's org",
    async () => {
      await api.functional.healthcarePlatform.nurse.appointments.reminders.at(
        connection,
        {
          appointmentId: appointmentB.id,
          reminderId: reminderB.id,
        },
      );
    },
  );
}
