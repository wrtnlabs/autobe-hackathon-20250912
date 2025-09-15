import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";

/**
 * Validate receptionist access permissions for room reservation detail
 * retrieval
 *
 * 1. Organization Admin registers and logs in
 * 2. Receptionist registers and logs in
 * 3. Organization Admin creates a room reservation using a randomly generated
 *    organization/room
 * 4. Receptionist fetches their own organization's reservation by ID - success
 *    validation
 * 5. Receptionist fetches reservation in a different organization - should get 403
 * 6. Receptionist fetches non-existent reservation - should get 404
 * 7. Validates all fields, and verifies no sensitive information is visible beyond
 *    receptionist's authorized view
 */
export async function test_api_room_reservation_receptionist_access_success_and_permissions(
  connection: api.IConnection,
) {
  // 1. Organization Admin registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  const organizationId = adminJoin.id;

  // 2. Receptionist registers
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPassword = RandomGenerator.alphaNumeric(12);
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistJoin);

  // Logout as admin and log in as receptionist for future access
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // Switch back: log back into admin account to create resource
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Organization Admin creates room reservation
  const roomId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const reservationStart = new Date(
    now.getTime() + 1000 * 60 * 10,
  ).toISOString();
  const reservationEnd = new Date(now.getTime() + 1000 * 60 * 60).toISOString();

  const reservationCreate =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organizationId,
          room_id: roomId,
          reservation_start: reservationStart,
          reservation_end: reservationEnd,
          reservation_type: RandomGenerator.paragraph({ sentences: 2 }),
          appointment_id: null,
        } satisfies IHealthcarePlatformRoomReservation.ICreate,
      },
    );

  typia.assert(reservationCreate);

  // 4. Receptionist logs in
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 5. Receptionist fetches the reservation - expect success
  const fetched =
    await api.functional.healthcarePlatform.receptionist.roomReservations.at(
      connection,
      {
        roomReservationId: reservationCreate.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "reservation fields match",
    fetched.id,
    reservationCreate.id,
  );
  TestValidator.equals(
    "organization match",
    fetched.healthcare_platform_organization_id,
    organizationId,
  );
  TestValidator.equals("room match", fetched.room_id, roomId);
  TestValidator.equals(
    "type match",
    fetched.reservation_type,
    reservationCreate.reservation_type,
  );
  TestValidator.equals(
    "start/end match",
    [fetched.reservation_start, fetched.reservation_end],
    [reservationStart, reservationEnd],
  );

  // 6. Receptionist attempts access to reservation in another org
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  const foreignReservation =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          room_id: typia.random<string & tags.Format<"uuid">>(),
          reservation_start: new Date(
            now.getTime() + 1000 * 60 * 120,
          ).toISOString(),
          reservation_end: new Date(
            now.getTime() + 1000 * 60 * 180,
          ).toISOString(),
          reservation_type: RandomGenerator.paragraph({ sentences: 2 }),
          appointment_id: null,
        } satisfies IHealthcarePlatformRoomReservation.ICreate,
      },
    );
  // Switch back to receptionist
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  await TestValidator.error(
    "receptionist gets forbidden for other org's reservation",
    async () => {
      await api.functional.healthcarePlatform.receptionist.roomReservations.at(
        connection,
        {
          roomReservationId: foreignReservation.id,
        },
      );
    },
  );

  // 7. Non-existent roomReservationId (random UUID, not used)
  await TestValidator.error(
    "receptionist gets 404 on non-existent reservationId",
    async () => {
      await api.functional.healthcarePlatform.receptionist.roomReservations.at(
        connection,
        {
          roomReservationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. Data sensitivity/audit checks (fields limited, no extra exposure)
  const allowedFields = [
    "id",
    "healthcare_platform_organization_id",
    "room_id",
    "reservation_start",
    "reservation_end",
    "reservation_type",
    "appointment_id",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  for (const field in fetched) {
    TestValidator.predicate(
      `no sensitive/unexpected field '${field}' exposed`,
      allowedFields.includes(field),
    );
  }
}
