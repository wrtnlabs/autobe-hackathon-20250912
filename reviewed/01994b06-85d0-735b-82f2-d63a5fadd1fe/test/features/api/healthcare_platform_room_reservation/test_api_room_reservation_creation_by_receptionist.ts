import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";

/**
 * Validates receptionist-driven creation of new room reservations, including
 * business and error paths.
 *
 * Steps:
 *
 * 1. Register a new receptionist and retrieve access context
 * 2. Generate valid organization, room, and appointment UUIDs
 * 3. Make a valid reservation request as the receptionist
 * 4. Validate creation response and audit fields
 * 5. Attempt to create a duplicate (same room/times) and ensure error
 * 6. Try to reserve for a different organization and ensure access error
 */
export async function test_api_room_reservation_creation_by_receptionist(
  connection: api.IConnection,
) {
  // 1. Receptionist registration
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistJoinBody = {
    email: receptionistEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: receptionistJoinBody,
    });
  typia.assert(receptionist);

  // 2. Make valid reservation
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const roomId = typia.random<string & tags.Format<"uuid">>();
  const appointmentId = typia.random<string & tags.Format<"uuid">>();
  const startTs = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30min from now
  const endTs = new Date(Date.now() + 90 * 60 * 1000).toISOString(); // 1hr after start
  const createReservationBody = {
    healthcare_platform_organization_id: organizationId,
    room_id: roomId,
    reservation_start: startTs,
    reservation_end: endTs,
    reservation_type: "appointment",
    appointment_id: appointmentId,
  } satisfies IHealthcarePlatformRoomReservation.ICreate;

  const reservation =
    await api.functional.healthcarePlatform.receptionist.roomReservations.create(
      connection,
      { body: createReservationBody },
    );
  typia.assert(reservation);
  TestValidator.equals(
    "organization_id matches",
    reservation.healthcare_platform_organization_id,
    createReservationBody.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "room_id matches",
    reservation.room_id,
    createReservationBody.room_id,
  );
  TestValidator.equals(
    "reservation_start matches",
    reservation.reservation_start,
    createReservationBody.reservation_start,
  );
  TestValidator.equals(
    "reservation_end matches",
    reservation.reservation_end,
    createReservationBody.reservation_end,
  );
  TestValidator.equals(
    "appointment_id matches",
    reservation.appointment_id,
    createReservationBody.appointment_id,
  );
  TestValidator.predicate(
    "created_at present and ISO format",
    typeof reservation.created_at === "string" &&
      !isNaN(Date.parse(reservation.created_at)),
  );
  TestValidator.predicate(
    "updated_at present and ISO format",
    typeof reservation.updated_at === "string" &&
      !isNaN(Date.parse(reservation.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    reservation.deleted_at,
    null,
  );

  // 3. Attempt double-booking (should fail by business logic)
  await TestValidator.error(
    "Double-booking same room/times results in business error",
    async () => {
      await api.functional.healthcarePlatform.receptionist.roomReservations.create(
        connection,
        { body: createReservationBody },
      );
    },
  );

  // 4. Attempt to book for a different organization (should fail by access control)
  const otherOrgBody = {
    ...createReservationBody,
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  await TestValidator.error(
    "Receptionist cannot reserve for another organization",
    async () => {
      await api.functional.healthcarePlatform.receptionist.roomReservations.create(
        connection,
        { body: otherOrgBody },
      );
    },
  );
}
