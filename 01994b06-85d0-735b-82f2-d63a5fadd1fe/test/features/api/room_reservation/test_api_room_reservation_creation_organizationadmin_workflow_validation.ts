import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";

/**
 * E2E test for full room reservation creation workflow by organization
 * admin.
 *
 * Steps:
 *
 * 1. Register and login as organization admin
 * 2. Simulate existing organization, room, and appointment UUIDs (since APIs
 *    are not present)
 * 3. Create a valid room reservation
 * 4. Validate output structure and content
 * 5. Check double-booking error using same room+org+time window
 * 6. Check 404 or business error for non-existent org/room/appointment IDs
 * 7. (Audit log effect is implicitly exercised by the API attempts)
 */
export async function test_api_room_reservation_creation_organizationadmin_workflow_validation(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin1 = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      phone: adminPhone,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(admin1);

  // 1b: Re-login for session (simulate fresh session, as caution)
  const adminSession = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminSession);

  // 2. Simulate creation of IDs for org/room/appointment
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const roomId = typia.random<string & tags.Format<"uuid">>();
  const appointmentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create valid reservation
  const now = new Date();
  const reservationStart = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString();
  const reservationEnd = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString();
  const reservationBody = {
    healthcare_platform_organization_id: organizationId,
    room_id: roomId,
    reservation_start: reservationStart,
    reservation_end: reservationEnd,
    reservation_type: "appointment",
    appointment_id: appointmentId,
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      { body: reservationBody },
    );
  typia.assert(reservation);
  TestValidator.equals(
    "reservation org id matches input",
    reservation.healthcare_platform_organization_id,
    organizationId,
  );
  TestValidator.equals(
    "reservation room id matches input",
    reservation.room_id,
    roomId,
  );
  TestValidator.equals(
    "reservation times and type",
    {
      start: reservation.reservation_start,
      end: reservation.reservation_end,
      type: reservation.reservation_type,
    },
    { start: reservationStart, end: reservationEnd, type: "appointment" },
  );
  TestValidator.equals(
    "reservation appointment id matches",
    reservation.appointment_id,
    appointmentId,
  );

  // 4. Double-booking (overlapping reservation for same room+organization+time window)
  await TestValidator.error("double-booking a room should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      { body: reservationBody },
    );
  });

  // 5. Creating reservation with non-existent organization/room/appointment
  const fakeOrgBody = {
    ...reservationBody,
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  await TestValidator.error(
    "reservation with non-existent organization should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
        connection,
        { body: fakeOrgBody },
      );
    },
  );
  const fakeRoomBody = {
    ...reservationBody,
    room_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  await TestValidator.error(
    "reservation with non-existent room should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
        connection,
        { body: fakeRoomBody },
      );
    },
  );
  const fakeApptBody = {
    ...reservationBody,
    appointment_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  await TestValidator.error(
    "reservation with non-existent appointment should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
        connection,
        { body: fakeApptBody },
      );
    },
  );
}
