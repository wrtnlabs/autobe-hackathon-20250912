import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Test technician updates appointment waitlist status and details. This test
 * validates cross-role, multi-actor workflow for updating an appointment
 * waitlist entry in a healthcare platform.
 *
 * Steps:
 *
 * 1. Technician account registration and login
 * 2. Patient account registration and login
 * 3. Receptionist account registration and login
 * 4. Receptionist creates an appointment (with valid random IDs for organization,
 *    department, provider, and status)
 * 5. Patient joins the appointment's waitlist
 * 6. Technician updates waitlist status (e.g. 'active' -> 'promoted', and updates
 *    join_time)
 * 7. Validate updated status/join_time/audit field(s)
 * 8. Attempt invalid update (on removed/finalized entry) and expect business rule
 *    error
 * 9. Attempt forbidden update as patient (should fail authorization)
 */
export async function test_api_technician_appointment_waitlist_update_status_and_details(
  connection: api.IConnection,
) {
  // 1. Register technician
  const technicianEmail = RandomGenerator.alphaNumeric(8) + "@workplace.com";
  const technicianPassword = RandomGenerator.alphaNumeric(12);
  const technicianLicense = RandomGenerator.alphaNumeric(8);
  const technicianJoin = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      license_number: technicianLicense,
      specialty: "lab",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(technicianJoin);

  // 2. Register patient
  const patientEmail = RandomGenerator.alphaNumeric(8) + "@patient.com";
  const patientPassword = RandomGenerator.alphaNumeric(10);
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 1, 1).toISOString() as string &
        tags.Format<"date-time">,
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientJoin);

  // 3. Register receptionist
  const receptionistEmail = RandomGenerator.alphaNumeric(8) + "@clinic.com";
  const receptionistPassword = RandomGenerator.alphaNumeric(10);
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail as string & tags.Format<"email">,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistJoin);

  // 4. Receptionist login
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail as string & tags.Format<"email">,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 5. Create appointment
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          healthcare_platform_department_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: patientJoin.id,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          room_id: null,
          equipment_id: null,
          appointment_type: "in-person",
          start_time: new Date(
            Date.now() + 3600 * 1000,
          ).toISOString() as string & tags.Format<"date-time">,
          end_time: new Date(
            Date.now() + 2 * 3600 * 1000,
          ).toISOString() as string & tags.Format<"date-time">,
          title: "Annual Checkup",
          description: "Test appointment for waitlist scenario.",
          recurrence_rule: null,
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 6. Patient login
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 7. Patient joins waitlist
  const waitlist =
    await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patientJoin.id,
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlist);

  // 8. Technician login
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail as string & tags.Format<"email">,
      password: technicianPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 9. Update waitlist status as technician (e.g. "promoted")
  const updatedWaitlist =
    await api.functional.healthcarePlatform.technician.appointments.waitlists.update(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
        body: {
          status: "promoted",
          join_time: new Date().toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate,
      },
    );
  typia.assert(updatedWaitlist);
  TestValidator.equals(
    "waitlist status updated",
    updatedWaitlist.status,
    "promoted",
  );
  TestValidator.notEquals(
    "updated_at is changed",
    updatedWaitlist.updated_at,
    waitlist.updated_at,
  );

  // 10. Remove waitlist entry as technician
  const removedWaitlist =
    await api.functional.healthcarePlatform.technician.appointments.waitlists.update(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
        body: {
          status: "removed",
          join_time: new Date().toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate,
      },
    );
  typia.assert(removedWaitlist);
  TestValidator.equals("waitlist removed", removedWaitlist.status, "removed");

  // 11. Try invalid update after removal (should fail)
  await TestValidator.error(
    "cannot update finalized/removed waitlist entry again",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.waitlists.update(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: waitlist.id,
          body: {
            status: "promoted",
          } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate,
        },
      );
    },
  );

  // 12. Patient login and attempt forbidden update (should fail)
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  await TestValidator.error(
    "patient cannot update waitlist status",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.waitlists.update(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: waitlist.id,
          body: {
            status: "active",
          } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate,
        },
      );
    },
  );
}
