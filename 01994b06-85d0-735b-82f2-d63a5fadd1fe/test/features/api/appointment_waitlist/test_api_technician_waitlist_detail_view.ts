import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * End-to-end test validating technician waitlist detail viewing with
 * permission and error logic in a healthcare platform.
 *
 * This scenario validates the correct enforcement of authorization
 * boundaries for the GET
 * /healthcarePlatform/technician/appointments/{appointmentId}/waitlists/{waitlistId}
 * endpoint:
 *
 * 1. System admin registers and logs in (establishes org context).
 * 2. Receptionist registers and logs in.
 * 3. Technician registers and logs in.
 * 4. Receptionist creates a new appointment (assigns technician as provider).
 * 5. System admin adds a waitlist entry to the appointment for a patient.
 * 6. Technician fetches the waitlist detail (success: verifies details match
 *    what was created).
 * 7. A different technician (assumed another org) attempts to view waitlist
 *    (denied).
 * 8. Receptionist role attempts to view waitlist via technician endpoint
 *    (denied).
 * 9. Unauthenticated session (no login) attempts view (denied).
 * 10. Technician attempts to fetch waitlist using invalid waitlistId and
 *     appointmentId (not found errors).
 *
 * The test ensures that:
 *
 * - Only technicians assigned to the appointment (or with proper permissions)
 *   can view corresponding waitlist entries. Cross-role and
 *   cross-organization accesses are denied.
 * - The waitlist detail includes all expected properties and matches creation
 *   input.
 * - Error scenarios (wrong role, unauthenticated, not found) are consistently
 *   denied as required by business logic.
 */
export async function test_api_technician_waitlist_detail_view(
  connection: api.IConnection,
) {
  // 1. System admin registers and logs in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminJoin.token.access,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Receptionist registers and logs in
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistJoin);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistJoin.token.access,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Technician registers and logs in
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const license = RandomGenerator.alphaNumeric(8);
  const technicianJoin = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianEmail,
      full_name: RandomGenerator.name(),
      license_number: license,
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(technicianJoin);
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail,
      password: technicianJoin.token.access,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 4. Receptionist creates an appointment in the org for the technician
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistJoin.token.access,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  const appointmentCreate =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id:
            adminJoin.id satisfies string as string,
          provider_id: technicianJoin.id satisfies string as string,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointmentCreate);
  const appointmentId = appointmentCreate.id;

  // 5. System admin adds waitlist entry
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminJoin.token.access,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const waitlistCreate =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointmentId,
        body: {
          appointment_id: appointmentId,
          patient_id: appointmentCreate.patient_id,
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlistCreate);

  // 6. Technician fetches waitlist detail (expected: success)
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail,
      password: technicianJoin.token.access,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  const waitlistGot =
    await api.functional.healthcarePlatform.technician.appointments.waitlists.at(
      connection,
      {
        appointmentId: appointmentId,
        waitlistId: waitlistCreate.id,
      },
    );
  typia.assert(waitlistGot);
  TestValidator.equals(
    "waitlist id matches",
    waitlistGot.id,
    waitlistCreate.id,
  );
  TestValidator.equals(
    "patient id matches",
    waitlistGot.patient_id,
    waitlistCreate.patient_id,
  );
  TestValidator.equals("status is active", waitlistGot.status, "active");

  // 7. Cross-org technician forbidden
  const tech2Email = typia.random<string & tags.Format<"email">>();
  const tech2Join = await api.functional.auth.technician.join(connection, {
    body: {
      email: tech2Email,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(tech2Join);
  await api.functional.auth.technician.login(connection, {
    body: {
      email: tech2Email,
      password: tech2Join.token.access,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  await TestValidator.error(
    "cross-org technician forbidden from viewing waitlist",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.waitlists.at(
        connection,
        {
          appointmentId: appointmentId,
          waitlistId: waitlistCreate.id,
        },
      );
    },
  );

  // 8. Receptionist cannot view technician waitlist detail
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistJoin.token.access,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  await TestValidator.error(
    "receptionist cannot view technician waitlist detail",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.waitlists.at(
        connection,
        {
          appointmentId: appointmentId,
          waitlistId: waitlistCreate.id,
        },
      );
    },
  );

  // 9. Unauthenticated session forbidden
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated session cannot view waitlist detail",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.waitlists.at(
        unauthConn,
        {
          appointmentId: appointmentId,
          waitlistId: waitlistCreate.id,
        },
      );
    },
  );

  // 10. Not found errors for invalid IDs
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail,
      password: technicianJoin.token.access,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  await TestValidator.error("invalid waitlist id gives not found", async () => {
    await api.functional.healthcarePlatform.technician.appointments.waitlists.at(
      connection,
      {
        appointmentId: appointmentId,
        waitlistId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  await TestValidator.error(
    "invalid appointment id gives not found",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.waitlists.at(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
          waitlistId: waitlistCreate.id,
        },
      );
    },
  );
}
