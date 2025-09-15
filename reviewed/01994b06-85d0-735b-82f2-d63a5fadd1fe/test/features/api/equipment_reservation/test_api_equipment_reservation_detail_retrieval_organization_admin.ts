import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin can retrieve reservation details for their own
 * organization, but not for reservations belonging to others.
 *
 * - Register and authenticate Admin 1 (org1)
 * - Create equipment reservation as Admin 1 -> get equipmentReservationId
 * - GET detail as Admin 1 using equipmentReservationId: expect success,
 *   validate all fields & type
 * - Register and authenticate Admin 2 (org2)
 * - GET detail as Admin 2 using Admin 1's equipmentReservationId: expect
 *   error (not found/forbidden)
 * - GET detail as Admin 1 with a non-existent reservationId (random UUID):
 *   expect error (not found)
 */
export async function test_api_equipment_reservation_detail_retrieval_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register & authenticate Admin 1 (org1)
  const admin1Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin1Join);
  const org1Id = admin1Join.id;

  // 2. Create an equipment reservation in Admin 1's org
  const equipmentId = typia.random<string & tags.Format<"uuid">>();
  const reservationPayload = {
    organization_id: org1Id,
    equipment_id: equipmentId,
    reservation_start: new Date(Date.now() + 60_000).toISOString(),
    reservation_end: new Date(Date.now() + 3_600_000).toISOString(),
    appointment_id: null,
    reservation_type: "scheduled",
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
      connection,
      { body: reservationPayload },
    );
  typia.assert(reservation);
  const reservationId = reservation.id;

  // 3. GET detail as Admin 1 (should succeed and match fields)
  const retrieved =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.at(
      connection,
      { equipmentReservationId: reservationId },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "reservation details from detail API match created data",
    retrieved,
    reservation,
  );

  // 4. Register & authenticate Admin 2 (org2)
  const admin2Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin2Join);

  // 5. GET as Admin 2 using Admin 1's reservationId: should error (out of org scope)
  await TestValidator.error(
    "cross-organization detail retrieval must fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.at(
        connection,
        { equipmentReservationId: reservationId },
      );
    },
  );

  // 6. GET as Admin 1 with random UUID (non-existent reservationId): should error
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: admin1Join.email,
      full_name: admin1Join.full_name,
      phone: admin1Join.phone ?? undefined,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  await TestValidator.error(
    "retrieval with non-existent reservationId fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.at(
        connection,
        {
          equipmentReservationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
