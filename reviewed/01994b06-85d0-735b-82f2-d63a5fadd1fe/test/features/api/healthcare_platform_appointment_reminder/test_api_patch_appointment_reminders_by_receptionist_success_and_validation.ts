import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentReminder";

/**
 * Validate the ability of a receptionist to patch reminders for a specific
 * appointment, ensuring success and also validation against invalid scenarios.
 *
 * This test covers:
 *
 * - Receptionist registration/login
 * - Appointment creation (gather all required UUIDs for organization, provider,
 *   patient, status)
 * - Creating at least one reminder for a valid appointment
 * - Patching reminders for the appointment, filtering by valid recipient_id, and
 *   validating the updated state
 * - Trying with an invalid recipient_id and appointmentId, expecting error
 * - Attempting to patch reminders for an appointment not belonging to
 *   organization or non-existent ID
 *
 * 1. Register a receptionist (get their info, organization ID, etc)
 * 2. Login as the receptionist
 * 3. Create an appointment (random org/department/provider/patient/status UUIDs;
 *    realistic dummy values but valid format)
 * 4. Create a reminder for the appointment (receiver is dummy patient/provider)
 * 5. Patch reminders for that appointment using the PATCH endpoint (valid
 *    recipient ID)
 * 6. Validate: reminders returned are the ones for this appointment/recipient
 * 7. Edge: try PATCH with invalid/nonexistent recipient or appointment, expect
 *    error (error validation only, no type error)
 */
export async function test_api_patch_appointment_reminders_by_receptionist_success_and_validation(
  connection: api.IConnection,
) {
  // 1. Receptionist registration
  const receptionistInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: receptionistInput,
  });
  typia.assert(receptionist);

  // 2. Receptionist login
  const receptionistLogin = await api.functional.auth.receptionist.login(
    connection,
    {
      body: {
        email: receptionist.email,
        password: receptionistInput.phone ?? "password123", // fake password logic (usually get password from join response or input)
      },
    },
  );
  typia.assert(receptionistLogin);

  // 3. Create appointment (need orgID, providerID, patientID, statusID, etc. Assume random UUIDs for demo validness)
  const appointmentInput = {
    healthcare_platform_organization_id: receptionist.id as string &
      tags.Format<"uuid">, // fake for demo; typically get from org context
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointmentInput },
    );
  typia.assert(appointment);

  // 4. Create a reminder
  const reminderInput = {
    reminder_time: new Date(Date.now() + 1800000).toISOString(),
    recipient_type: RandomGenerator.pick(["patient", "provider"] as const),
    recipient_id: appointment.patient_id,
    delivery_channel: RandomGenerator.pick(["email", "sms", "in_app"] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.receptionist.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderInput,
      },
    );
  typia.assert(reminder);

  // 5. Patch reminders for the appointment (simulate with recipient_id filter)
  const patchBody = {
    appointment_id: appointment.id,
    recipient_id: appointment.patient_id,
  } satisfies IHealthcarePlatformAppointmentReminder.IRequest;
  const patched =
    await api.functional.healthcarePlatform.receptionist.appointments.reminders.index(
      connection,
      {
        appointmentId: appointment.id,
        body: patchBody,
      },
    );
  typia.assert(patched);
  TestValidator.equals(
    "patched reminders contains the created one",
    patched.data.find((r) => r.id === reminder.id)?.appointment_id,
    appointment.id,
  );

  // 6. Edge case: patch with invalid recipient_id
  await TestValidator.error(
    "patch reminders with non-existent recipient_id fails",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.reminders.index(
        connection,
        {
          appointmentId: appointment.id,
          body: {
            appointment_id: appointment.id,
            recipient_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHealthcarePlatformAppointmentReminder.IRequest,
        },
      );
    },
  );

  // 7. Edge case: patch with invalid appointment_id
  await TestValidator.error(
    "patch reminders with non-existent appointment_id fails",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.reminders.index(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            appointment_id: typia.random<string & tags.Format<"uuid">>(),
            recipient_id: appointment.patient_id,
          } satisfies IHealthcarePlatformAppointmentReminder.IRequest,
        },
      );
    },
  );
}
