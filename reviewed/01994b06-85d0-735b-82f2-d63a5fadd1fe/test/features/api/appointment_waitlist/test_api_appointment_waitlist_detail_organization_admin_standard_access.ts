import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validate organization admin can retrieve details of a specific
 * appointment waitlist entry.
 *
 * Scenario:
 *
 * 1. Register an organization admin and authenticate.
 * 2. Register a receptionist (no password needed for join — see DTO) and
 *    authenticate as receptionist.
 * 3. Create a new appointment using receptionist API
 *    (provider/patient/status/org all get random UUIDs to satisfy schema).
 * 4. Switch back to organization admin.
 * 5. Add a new waitlist entry to this appointment (use patient_id from created
 *    appointment for test).
 * 6. Retrieve details for the just-created waitlist entry as organization
 *    admin.
 * 7. Validate response contract (all required fields present, ids match entry,
 *    status present, join_time present).
 * 8. Validate returned object matches the values used when creating waitlist
 *    entry.
 */
export async function test_api_appointment_waitlist_detail_organization_admin_standard_access(
  connection: api.IConnection,
) {
  // 1. Register and login as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminName = RandomGenerator.name();
  const orgAdminPassword = RandomGenerator.alphabets(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: orgAdminName,
        password: orgAdminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // 2. Register receptionist (no password in join), and login as receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistName = RandomGenerator.name();
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: receptionistName,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(receptionist);

  // Password not set on receptionist join (per DTO), so use random one just for login
  const receptionistPassword = RandomGenerator.alphabets(10);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Create a new appointment as receptionist
  const appointmentCreate = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: appointmentCreate,
      },
    );
  typia.assert(appointment);

  // 4. Switch back to organization admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 5. Add new waitlist entry to this appointment (using patient_id from this appointment)
  const waitlistCreate = {
    appointment_id: appointment.id,
    patient_id: appointment.patient_id,
    join_time: new Date().toISOString(),
    status: "active",
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;
  const waitlist =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: waitlistCreate,
      },
    );
  typia.assert(waitlist);

  // 6. Retrieve the waitlist details as organization admin
  const output =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.at(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
      },
    );
  typia.assert(output);

  // 7. Validate returned waitlist detail fields
  TestValidator.equals("waitlist id matches", output.id, waitlist.id);
  TestValidator.equals(
    "appointment id matches",
    output.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "patient id matches",
    output.patient_id,
    appointment.patient_id,
  );
  TestValidator.equals(
    "waitlist status matches",
    output.status,
    waitlist.status,
  );
  TestValidator.equals(
    "waitlist join_time matches",
    output.join_time,
    waitlist.join_time,
  );
}
