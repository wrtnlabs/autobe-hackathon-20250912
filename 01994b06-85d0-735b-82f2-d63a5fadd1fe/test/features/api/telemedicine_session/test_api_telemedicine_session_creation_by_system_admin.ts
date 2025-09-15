import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";

/**
 * End-to-end scenario: System administrator creates a telemedicine session
 * referencing an appointment.
 *
 * Steps:
 *
 * 1. Register and login as organization admin.
 * 2. Register and login as system admin.
 * 3. Create an appointment as organization admin (for telemedicine session
 *    linkage).
 * 4. Login as system admin.
 * 5. Create a valid telemedicine session referencing the appointment.
 * 6. Validate returned fields and reference correctness.
 * 7. Test error: creation with invalid appointment_id (not found).
 * 8. Test error: duplicate session creation for the same appointment.
 * 9. Test error: creation as organization admin (insufficient permission for
 *    systemAdmin endpoint).
 */
export async function test_api_telemedicine_session_creation_by_system_admin(
  connection: api.IConnection,
) {
  // --- Organization admin registration for appointment creation ---
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "orgadminpw!1",
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: "orgadminpw!1",
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminLogin);

  // Create appointment as org admin (required fields only, realistic data)
  const appointmentInput =
    typia.random<IHealthcarePlatformAppointment.ICreate>();
  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: appointmentInput,
      },
    );
  typia.assert(appointment);

  // --- System admin registration ---
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      password: "sysadminPW!2",
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysAdminEmail,
        provider: "local",
        provider_key: sysAdminEmail,
        password: "sysadminPW!2",
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminLogin);

  // --- Create telemedicine session as systemAdmin ---
  const teleSessionCreate = {
    appointment_id: appointment.id,
    join_link: `https://telehealth.example.com/session/${typia.random<string & tags.Format<"uuid">>()}`,
    session_start: appointment.start_time,
    session_end: appointment.end_time,
    session_recorded: true,
  } satisfies IHealthcarePlatformTelemedicineSession.ICreate;

  const session =
    await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.create(
      connection,
      {
        body: teleSessionCreate,
      },
    );
  typia.assert(session);

  // Validate session - required fields + correct appointment_id linkage
  TestValidator.equals(
    "session appointment_id matches",
    session.appointment_id,
    appointment.id,
  );
  TestValidator.predicate(
    "join_link present",
    typeof session.join_link === "string" && session.join_link.length > 0,
  );
  TestValidator.predicate(
    "ISO session_start",
    typeof session.session_start === "string" &&
      !isNaN(Date.parse(session.session_start)),
  );
  TestValidator.predicate(
    "ISO session_end",
    typeof session.session_end === "string" &&
      !isNaN(Date.parse(session.session_end)),
  );
  TestValidator.predicate(
    "session_recorded true",
    session.session_recorded === true,
  );

  // --- Error: invalid appointment_id ---
  await TestValidator.error("invalid appointment_id (not found)", async () => {
    await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.create(
      connection,
      {
        body: {
          appointment_id: typia.random<string & tags.Format<"uuid">>(), // random, not a real appointment
          join_link: RandomGenerator.alphaNumeric(40),
          session_start: appointment.start_time,
          session_end: appointment.end_time,
          session_recorded: false,
        } satisfies IHealthcarePlatformTelemedicineSession.ICreate,
      },
    );
  });

  // --- Error: duplicate session for same appointment ---
  await TestValidator.error(
    "duplicate telemedicine session creation rejected",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.create(
        connection,
        {
          body: teleSessionCreate,
        },
      );
    },
  );

  // --- Error: access denied as org admin ---
  // Switch back to org admin login
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "orgadminpw!1",
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "org admin cannot create telemedicine session as system admin",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.create(
        connection,
        {
          body: teleSessionCreate,
        },
      );
    },
  );
}
