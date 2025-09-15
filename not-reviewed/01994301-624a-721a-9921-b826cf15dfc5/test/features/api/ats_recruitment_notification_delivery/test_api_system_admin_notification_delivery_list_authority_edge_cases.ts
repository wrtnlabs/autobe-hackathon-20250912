import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";
import type { IAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationDelivery";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentNotificationDelivery";

/**
 * End-to-end test for privileged system admin notification delivery listing
 * authority.
 *
 * Validates business workflow and edge cases for the PATCH
 * /atsRecruitment/systemAdmin/notifications/{notificationId}/deliveries
 * endpoint. Ensures that:
 *
 * - Only system admin can list/audit notification delivery attempts
 * - Filtering and pagination parameters are effective
 * - Permission errors and not-found cases are handled correctly
 *
 * Step-by-step process:
 *
 * 1. Register and login as a new system admin (join + login, distinct random
 *    email/password/name).
 * 2. System admin creates a notification (targeted to self with event_type,
 *    reference_table/id, initial status).
 * 3. System admin lists all deliveries for that notification (expecting 0 or
 *    more records, type+schema checks).
 * 4. Test pagination/filters: re-request with page/limit (expect correct data
 *    slice, no error if empty).
 * 5. Submit requests as non-admin: unauthorized access forbidden.
 * 6. Use a random non-existent notificationId: expect not found error.
 */
export async function test_api_system_admin_notification_delivery_list_authority_edge_cases(
  connection: api.IConnection,
) {
  // 1. Register new system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminName = RandomGenerator.name();
  const joinRes = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(joinRes);

  // 2. Login as admin
  const loginRes = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  typia.assert(loginRes);

  // 3. Create a notification (targeted to self)
  const notificationRes =
    await api.functional.atsRecruitment.notifications.create(connection, {
      body: {
        recipient_systemadmin_id: loginRes.id,
        event_type: "system_alert",
        reference_table: "admin_events",
        reference_id: typia.random<string & tags.Format<"uuid">>(),
        status: "pending",
      } satisfies IAtsRecruitmentNotification.ICreate,
    });
  typia.assert(notificationRes);

  // 4. System admin lists notification deliveries
  const res =
    await api.functional.atsRecruitment.systemAdmin.notifications.deliveries.index(
      connection,
      {
        notificationId: notificationRes.id,
        body: {},
      },
    );
  typia.assert(res);

  // Validate records (should be for correct notificationId)
  TestValidator.predicate(
    "delivery records all match notificationId",
    res.data.every((x) => x.notification_id === notificationRes.id),
  );

  // 5. Pagination/limit check (request 1 record per page)
  const paged =
    await api.functional.atsRecruitment.systemAdmin.notifications.deliveries.index(
      connection,
      {
        notificationId: notificationRes.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "paged result page=1, limit=1",
    paged.pagination.current,
    1,
  );
  TestValidator.equals("paged result limit=1", paged.pagination.limit, 1);

  // 6. Filtering by channel (if any records exist with delivery_channel)
  if (res.data.length) {
    const firstChannel = res.data[0].delivery_channel;
    const filtered =
      await api.functional.atsRecruitment.systemAdmin.notifications.deliveries.index(
        connection,
        {
          notificationId: notificationRes.id,
          body: { delivery_channel: firstChannel },
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      "filter by channel only returns matching",
      filtered.data.every((d) => d.delivery_channel === firstChannel),
    );
  }

  // 7. Not-found edge case: random invalid notificationId
  await TestValidator.error("not found for random notificationId", async () => {
    await api.functional.atsRecruitment.systemAdmin.notifications.deliveries.index(
      connection,
      {
        notificationId: typia.random<string & tags.Format<"uuid">>(),
        body: {},
      },
    );
  });

  // 8. Forbidden: non-admin attempt (simulate non-admin connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "forbidden for non-authenticated/non-admin user",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.notifications.deliveries.index(
        unauthConn,
        {
          notificationId: notificationRes.id,
          body: {},
        },
      );
    },
  );
}
