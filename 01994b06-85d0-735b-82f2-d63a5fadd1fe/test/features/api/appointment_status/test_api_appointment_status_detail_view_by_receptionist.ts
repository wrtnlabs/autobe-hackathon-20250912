import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentStatus";

/**
 * Validate that a receptionist can view and retrieve specific appointment
 * status details.
 *
 * Test workflow:
 *
 * 1. Register and log in a receptionist
 * 2. List visible appointment statuses to get a valid statusId
 * 3. Retrieve the detail for this statusId and assert all fields
 * 4. Attempt to fetch a non-existent statusId (random uuid) and assert error
 */
export async function test_api_appointment_status_detail_view_by_receptionist(
  connection: api.IConnection,
) {
  // 1. Register & authenticate receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistFullName = RandomGenerator.name();
  const joinRes = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: receptionistFullName,
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(joinRes);

  // 2. List current appointment statuses
  const statusList =
    await api.functional.healthcarePlatform.receptionist.appointmentStatuses.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformAppointmentStatus.IRequest,
      },
    );
  typia.assert(statusList);
  TestValidator.predicate("status list non-empty", statusList.data.length > 0);
  const targetSummary = statusList.data[0];

  // 3. Detail view for that statusId
  const detail =
    await api.functional.healthcarePlatform.receptionist.appointmentStatuses.at(
      connection,
      {
        statusId: targetSummary.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("id matches summary", detail.id, targetSummary.id);
  TestValidator.equals(
    "label matches",
    detail.display_name,
    targetSummary.display_name,
  );
  TestValidator.equals(
    "code matches",
    detail.status_code,
    targetSummary.status_code,
  );
  TestValidator.equals(
    "business_status matches",
    detail.business_status,
    targetSummary.business_status,
  );

  // 4. Fetch non-existent status ID
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("not found for non-existent statusId", async () => {
    await api.functional.healthcarePlatform.receptionist.appointmentStatuses.at(
      connection,
      { statusId: fakeId },
    );
  });
}
