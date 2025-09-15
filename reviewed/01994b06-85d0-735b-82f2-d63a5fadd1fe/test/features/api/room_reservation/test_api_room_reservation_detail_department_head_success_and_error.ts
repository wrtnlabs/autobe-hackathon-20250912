import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";

/**
 * Test retrieving the details of a single room reservation as a department
 * head.
 *
 * 1. Register and authenticate department head. 2. Register and authenticate
 *    organization admin. 3. Organization admin creates a room reservation
 *    (valid data, assign to matching organization/department). 4. As department
 *    head, fetch the reservation by ID and validate all fields. 5. Error: 404
 *    when random non-existent UUID is used. 6. Error: 403 when attempting to
 *    access a reservation not linked to current department head's scope.
 */
export async function test_api_room_reservation_detail_department_head_success_and_error(
  connection: api.IConnection,
) {
  // 1. Register and authenticate department head
  const dh_email = typia.random<string & tags.Format<"email">>();
  const dh_password = RandomGenerator.alphaNumeric(10);
  const departmentHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: dh_email,
        full_name: RandomGenerator.name(),
        password: dh_password,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(departmentHead);

  // 2. Register and authenticate organization admin
  const oa_email = typia.random<string & tags.Format<"email">>();
  const oa_password = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: oa_email,
        full_name: RandomGenerator.name(),
        password: oa_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // Login as organization admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: oa_email,
      password: oa_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Organization admin creates a room reservation
  const reservationInput = {
    healthcare_platform_organization_id: orgAdmin.id,
    room_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date(Date.now() + 10000).toISOString(),
    reservation_end: new Date(Date.now() + 7200000).toISOString(),
    reservation_type: RandomGenerator.pick([
      "appointment",
      "admin",
      "cleaning",
      "maintenance",
      "event",
    ] as const),
    // Skipping appointment_id (optional, defaults to null)
  } satisfies IHealthcarePlatformRoomReservation.ICreate;

  const createdReservation: IHealthcarePlatformRoomReservation =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      {
        body: reservationInput,
      },
    );
  typia.assert(createdReservation);

  // 4. Switch to department head session
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: dh_email,
      password: dh_password,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 5. Department head fetches reservation successfully
  const fetched =
    await api.functional.healthcarePlatform.departmentHead.roomReservations.at(
      connection,
      {
        roomReservationId: createdReservation.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "reservation detail matches",
    fetched.id,
    createdReservation.id,
  );
  TestValidator.equals(
    "organization_id matches",
    fetched.healthcare_platform_organization_id,
    reservationInput.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "room_id matches",
    fetched.room_id,
    reservationInput.room_id,
  );
  TestValidator.equals(
    "reservation_type matches",
    fetched.reservation_type,
    reservationInput.reservation_type,
  );
  TestValidator.equals(
    "reservation_start matches",
    fetched.reservation_start,
    reservationInput.reservation_start,
  );
  TestValidator.equals(
    "reservation_end matches",
    fetched.reservation_end,
    reservationInput.reservation_end,
  );

  // 6. Error: 404 if non-existent UUID
  await TestValidator.error("404 for non-existent reservation", async () => {
    await api.functional.healthcarePlatform.departmentHead.roomReservations.at(
      connection,
      {
        roomReservationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 7. Error: 403 if accessing outside scope (simulate by creating another org admin, reservation)
  const oa2_email = typia.random<string & tags.Format<"email">>();
  const oa2_password = RandomGenerator.alphaNumeric(10);
  const orgAdmin2 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: oa2_email,
        full_name: RandomGenerator.name(),
        password: oa2_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin2);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: oa2_email,
      password: oa2_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const reservationOutOfScope =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgAdmin2.id,
          room_id: typia.random<string & tags.Format<"uuid">>(),
          reservation_start: new Date(Date.now() + 5000000).toISOString(),
          reservation_end: new Date(Date.now() + 5200000).toISOString(),
          reservation_type: RandomGenerator.pick([
            "appointment",
            "admin",
          ] as const),
        } satisfies IHealthcarePlatformRoomReservation.ICreate,
      },
    );
  typia.assert(reservationOutOfScope);

  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: dh_email,
      password: dh_password,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  await TestValidator.error(
    "403 for department head outside scope",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.roomReservations.at(
        connection,
        {
          roomReservationId: reservationOutOfScope.id,
        },
      );
    },
  );
}
