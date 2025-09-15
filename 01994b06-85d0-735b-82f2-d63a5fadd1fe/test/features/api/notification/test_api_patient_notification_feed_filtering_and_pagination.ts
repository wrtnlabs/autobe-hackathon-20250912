import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotification";

/**
 * Validate filtering, sorting and pagination of patient notification feed.
 *
 * 1. Register and login a patient user
 * 2. Query notifications with various filters: notificationType, channel,
 *    critical, status, date window, pagination (page/limit), sorting
 *    (sortField/sortOrder)
 * 3. For each request: a. Confirm only notification summaries (not full bodies)
 *    are returned b. Confirm only patient's and organization's notifications
 *    are returned c. Validate all returned ISummary structure fields d. Confirm
 *    privacy enforcement: cannot view other users' notifications
 * 4. Edge cases: future-only, last-month, unread-only, overflow page, sorted order
 * 5. Negative case: attempt to filter using another user ID or org ID and expect
 *    no results or error
 */
export async function test_api_patient_notification_feed_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register two distinct patients (A and B) and log in as A
  const patientAJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      1980 + Math.floor(Math.random() * 30),
      0,
      1,
    ).toISOString(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientA = await api.functional.auth.patient.join(connection, {
    body: patientAJoin,
  });
  typia.assert(patientA);

  const patientBJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      1980 + Math.floor(Math.random() * 30),
      0,
      1,
    ).toISOString(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientB = await api.functional.auth.patient.join(connection, {
    body: patientBJoin,
  });
  typia.assert(patientB);

  // 2. Login as patientA
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientAJoin.email,
      password: patientAJoin.password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 3a. Basic notification feed request (unfiltered)
  let response =
    await api.functional.healthcarePlatform.patient.notifications.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination information exists",
    !!response.pagination,
  );
  TestValidator.predicate("data array exists", Array.isArray(response.data));

  // 3b. Pagination and limit test (limit = 1)
  response =
    await api.functional.healthcarePlatform.patient.notifications.index(
      connection,
      {
        body: { limit: 1 } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "at most 1 notification in response",
    response.data.length <= 1,
    true,
  );

  // 3c. Sort order test by createdAt asc
  response =
    await api.functional.healthcarePlatform.patient.notifications.index(
      connection,
      {
        body: {
          sortField: "createdAt",
          sortOrder: "asc",
          limit: 5,
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(response);
  const times = response.data.map((n) => n.createdAt);
  for (let i = 1; i < times.length; ++i) {
    TestValidator.predicate(
      `ascending createdAt for result ${i}`,
      times[i] >= times[i - 1],
    );
  }

  // 3d. Filtering: notificationType/channel/status/critical
  // Sample type from existing results if available, otherwise random
  let typeValue: string | undefined =
    response.data[0]?.notificationType ?? undefined;
  if (!typeValue) typeValue = RandomGenerator.paragraph({ sentences: 1 });
  let channelValue: string | undefined =
    response.data[0]?.notificationChannel ?? undefined;
  if (!channelValue) channelValue = RandomGenerator.paragraph({ sentences: 1 });
  let statusValue: string | undefined =
    response.data[0]?.deliveryStatus ?? undefined;
  if (!statusValue)
    statusValue = RandomGenerator.pick([
      "pending",
      "delivered",
      "in_progress",
      "acknowledged",
      "failed",
    ] as const);
  const filteredResp =
    await api.functional.healthcarePlatform.patient.notifications.index(
      connection,
      {
        body: {
          notificationType: typeValue,
          notificationChannel: channelValue,
          deliveryStatus: statusValue,
          critical: true,
          limit: 5,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(filteredResp);
  // Check filter matches in returned data (if any)
  for (const row of filteredResp.data) {
    if (typeValue)
      TestValidator.equals(
        "filter by notificationType",
        row.notificationType,
        typeValue,
      );
    if (channelValue)
      TestValidator.equals(
        "filter by notificationChannel",
        row.notificationChannel,
        channelValue,
      );
    if (statusValue)
      TestValidator.equals(
        "filter by deliveryStatus",
        row.deliveryStatus,
        statusValue,
      );
    TestValidator.equals("critical should be true", row.critical, true);
  }

  // 4a. Date window filter: notifications in future (should be empty normally)
  const futureResp =
    await api.functional.healthcarePlatform.patient.notifications.index(
      connection,
      {
        body: {
          startDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
          limit: 5,
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(futureResp);
  TestValidator.equals(
    "future date results empty or valid",
    futureResp.data.length,
    0,
  );

  // 4b. Date window: notifications in past month
  const lastMonth = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const now = new Date().toISOString();
  const recentResp =
    await api.functional.healthcarePlatform.patient.notifications.index(
      connection,
      {
        body: {
          startDate: lastMonth,
          endDate: now,
          limit: 5,
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(recentResp);
  // All notifications are in the window
  for (const n of recentResp.data) {
    TestValidator.predicate(
      "createdAt within last month",
      n.createdAt >= lastMonth && n.createdAt <= now,
    );
  }

  // 4c. Overflow page (high page number)
  const overflowResp =
    await api.functional.healthcarePlatform.patient.notifications.index(
      connection,
      {
        body: {
          page: 99999 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5,
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(overflowResp);
  TestValidator.equals(
    "overflow page returns 0 results",
    overflowResp.data.length,
    0,
  );

  // 5. Negative test: try recipientUserId for patientB (should not see anything or should error/forbid)
  const forbiddenResp =
    await api.functional.healthcarePlatform.patient.notifications.index(
      connection,
      {
        body: {
          recipientUserId: patientB.id,
          limit: 5,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(forbiddenResp);
  TestValidator.equals(
    "cannot access another patient's notifications",
    forbiddenResp.data.length,
    0,
  );

  // For all returned notifications, validate ISummary structure (no secret body field)
  const allRows: IHealthcarePlatformNotification.ISummary[] = [
    ...response.data,
    ...filteredResp.data,
    ...recentResp.data,
  ];
  for (const notif of allRows) {
    typia.assert(notif);
    TestValidator.predicate(
      "required ISummary fields present",
      typeof notif.id === "string" &&
        typeof notif.notificationType === "string" &&
        typeof notif.notificationChannel === "string" &&
        typeof notif.critical === "boolean" &&
        typeof notif.deliveryStatus === "string" &&
        typeof notif.createdAt === "string",
    );
    TestValidator.equals(
      "should not expose notification body",
      (notif as any).body,
      undefined,
    );
  }
}
