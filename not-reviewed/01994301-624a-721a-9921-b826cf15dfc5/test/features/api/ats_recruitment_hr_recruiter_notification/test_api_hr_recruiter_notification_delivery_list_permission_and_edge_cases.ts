import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";
import type { IAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationDelivery";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentNotificationDelivery";

/**
 * E2E test for HR recruiter notification delivery list: permission and edge
 * cases.
 *
 * Business context: Only the notification's recipient HR recruiter may view
 * delivery attempts for the notification. The test ensures authorized
 * delivery listing, filtering/pagination coverage, and proper error
 * handling for forbidden/invalid queries.
 *
 * Steps:
 *
 * 1. Register and authenticate HR recruiter A (and keep password).
 * 2. Register and authenticate HR recruiter B (for negative permission tests,
 *    keep password).
 * 3. Recruiter A creates a notification for self with a unique
 *    reference_id/event_type.
 * 4. List delivery attempts for this notification, check all deliveries
 *    reference the correct notification, pagination/meta logic is correct.
 * 5. List deliveries with a filter (delivery_channel/status if present),
 *    verify results still belong to notification.
 * 6. Request deliveries with pagination (limit: 1), check output size and
 *    pagination data.
 * 7. Attempt to list with an invalid (random) notificationId (expect error).
 * 8. Switch to recruiter B, attempt to list deliveries for A's notification
 *    (expect permission denied error).
 */
export async function test_api_hr_recruiter_notification_delivery_list_permission_and_edge_cases(
  connection: api.IConnection,
) {
  // 1. Register and login as recruiter A
  const recruiterAPassword = RandomGenerator.alphaNumeric(12);
  const joinA = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: recruiterAPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(joinA);

  // 2. Register and login as recruiter B
  const recruiterBPassword = RandomGenerator.alphaNumeric(12);
  const joinB = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: recruiterBPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(joinB);

  // 3. Recruiter A: create a notification for self
  const notification = await api.functional.atsRecruitment.notifications.create(
    connection,
    {
      body: {
        recipient_hrrecruiter_id: joinA.id,
        event_type: RandomGenerator.alphabets(10),
        reference_table: RandomGenerator.alphabets(10),
        reference_id: typia.random<string & tags.Format<"uuid">>(),
        status: "pending",
      } satisfies IAtsRecruitmentNotification.ICreate,
    },
  );
  typia.assert(notification);

  // 4. List delivery attempts for this notification
  const pageUnfiltered: IPageIAtsRecruitmentNotificationDelivery =
    await api.functional.atsRecruitment.hrRecruiter.notifications.deliveries.index(
      connection,
      {
        notificationId: notification.id,
        body: {},
      },
    );
  typia.assert(pageUnfiltered);
  TestValidator.equals(
    "all deliveries reference correct notification",
    pageUnfiltered.data.every((d) => d.notification_id === notification.id),
    true,
  );

  // 5. If there are any deliveries, filter by delivery_channel and delivery_status if present
  if (pageUnfiltered.data.length > 0) {
    const deliverySample = pageUnfiltered.data[0];
    const filterBody = {
      delivery_channel: deliverySample.delivery_channel,
      ...(deliverySample.delivery_status
        ? { delivery_status: deliverySample.delivery_status }
        : {}),
    } satisfies IAtsRecruitmentNotificationDelivery.IRequest;
    const pageFiltered =
      await api.functional.atsRecruitment.hrRecruiter.notifications.deliveries.index(
        connection,
        {
          notificationId: notification.id,
          body: filterBody,
        },
      );
    typia.assert(pageFiltered);
    TestValidator.equals(
      "filtered deliveries reference correct notification",
      pageFiltered.data.every((d) => d.notification_id === notification.id),
      true,
    );
    TestValidator.predicate(
      "all filtered deliveries match the filter conditions",
      pageFiltered.data.every(
        (d) =>
          d.delivery_channel === deliverySample.delivery_channel &&
          (!deliverySample.delivery_status ||
            d.delivery_status === deliverySample.delivery_status),
      ),
    );
  }

  // 6. Pagination test: request with limit 1, check page data and limits
  const pagedBody = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IAtsRecruitmentNotificationDelivery.IRequest;
  const pagePaginated =
    await api.functional.atsRecruitment.hrRecruiter.notifications.deliveries.index(
      connection,
      {
        notificationId: notification.id,
        body: pagedBody,
      },
    );
  typia.assert(pagePaginated);
  TestValidator.equals(
    "paginated result uses limit 1",
    pagePaginated.data.length,
    Math.min(pagePaginated.pagination.limit, pagePaginated.pagination.records),
  );
  TestValidator.equals(
    "pagination current matches request",
    pagePaginated.pagination.current,
    pagedBody.page,
  );

  // 7. Request deliveries with an invalid notificationId
  const nonExistentNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "invalid notificationId returns error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.notifications.deliveries.index(
        connection,
        {
          notificationId: nonExistentNotificationId,
          body: {},
        },
      );
    },
  );

  // 8. Switch to recruiter B and try to access deliveries for recruiter A's notification
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: joinB.email,
      password: recruiterBPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error(
    "unauthorized recruiter cannot access deliveries of another recruiter's notification",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.notifications.deliveries.index(
        connection,
        {
          notificationId: notification.id,
          body: {},
        },
      );
    },
  );
}
