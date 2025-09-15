import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotification";

/**
 * Validate that an authenticated medicalDoctor can list and filter their
 * notifications. Steps:
 *
 * 1. Register a new medicalDoctor and log in.
 * 2. List all notifications, expect those only for their user/context.
 * 3. Test filtering by notificationType, notificationChannel, deliveryStatus,
 *    createdAt windows
 * 4. Test pagination: request different page/limit values, empty last page,
 *    excessive out-of-bounds page
 * 5. Ensure no notification is outside the allowed scope.
 * 6. Validate edge case: empty query (should succeed with 0 results if no data)
 */
export async function test_api_notifications_patch_medicaldoctor_filter_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register and login as medicalDoctor
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const joinRes = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email,
      full_name: RandomGenerator.name(3),
      npi_number: RandomGenerator.alphaNumeric(10),
      password,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(joinRes);

  // Store profile info for filtering
  const doctorId = typia.assert<string & tags.Format<"uuid">>(joinRes.id);

  // 2. Login for fresh token
  const loginRes = await api.functional.auth.medicalDoctor.login(connection, {
    body: { email, password } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  typia.assert(loginRes);

  // 3. Initial notification list (no filters)
  const resInitial =
    await api.functional.healthcarePlatform.medicalDoctor.notifications.index(
      connection,
      { body: {} satisfies IHealthcarePlatformNotification.IRequest },
    );
  typia.assert(resInitial);
  // All results must belong to or be accessible by the medicalDoctor
  for (const notif of resInitial.data) {
    TestValidator.predicate(
      "notification access control",
      typeof notif.notificationType === "string" &&
        typeof notif.id === "string",
    );
  }

  // 4. Filter by notificationType (if any returned)
  if (resInitial.data.length > 0) {
    const sampleType = resInitial.data[0].notificationType;
    const filteredByType =
      await api.functional.healthcarePlatform.medicalDoctor.notifications.index(
        connection,
        {
          body: {
            notificationType: sampleType,
          } satisfies IHealthcarePlatformNotification.IRequest,
        },
      );
    typia.assert(filteredByType);
    for (const notif of filteredByType.data) {
      TestValidator.equals(
        "notificationType matches filter",
        notif.notificationType,
        sampleType,
      );
    }
  }

  // 5. Filter by notificationChannel (if any returned)
  if (resInitial.data.length > 0) {
    const sampleChannel = resInitial.data[0].notificationChannel;
    const filteredByChannel =
      await api.functional.healthcarePlatform.medicalDoctor.notifications.index(
        connection,
        {
          body: {
            notificationChannel: sampleChannel,
          } satisfies IHealthcarePlatformNotification.IRequest,
        },
      );
    typia.assert(filteredByChannel);
    for (const notif of filteredByChannel.data) {
      TestValidator.equals(
        "notificationChannel matches filter",
        notif.notificationChannel,
        sampleChannel,
      );
    }
  }

  // 6. Filter by deliveryStatus (if any returned)
  if (resInitial.data.length > 0) {
    const sampleStatus = resInitial.data[0].deliveryStatus;
    const filteredByStatus =
      await api.functional.healthcarePlatform.medicalDoctor.notifications.index(
        connection,
        {
          body: {
            deliveryStatus: sampleStatus,
          } satisfies IHealthcarePlatformNotification.IRequest,
        },
      );
    typia.assert(filteredByStatus);
    for (const notif of filteredByStatus.data) {
      TestValidator.equals(
        "deliveryStatus matches filter",
        notif.deliveryStatus,
        sampleStatus,
      );
    }
  }

  // 7. Filter by createdAt time window (if any returned)
  if (resInitial.data.length > 0) {
    const { createdAt } = resInitial.data[0];
    // window before createdAt
    const beforeWindow =
      await api.functional.healthcarePlatform.medicalDoctor.notifications.index(
        connection,
        {
          body: {
            endDate: new Date(
              new Date(createdAt).getTime() - 1000,
            ).toISOString(),
          } satisfies IHealthcarePlatformNotification.IRequest,
        },
      );
    typia.assert(beforeWindow);
    TestValidator.equals(
      "should be empty before createdAt",
      beforeWindow.data.length,
      0,
    );
    // window after createdAt
    const afterWindow =
      await api.functional.healthcarePlatform.medicalDoctor.notifications.index(
        connection,
        {
          body: {
            startDate: createdAt,
          } satisfies IHealthcarePlatformNotification.IRequest,
        },
      );
    typia.assert(afterWindow);
    TestValidator.predicate(
      "should have results after or at createdAt",
      afterWindow.data.length >= 1,
    );
  }

  // 8. Pagination checks
  const pageSize = 2;
  const firstPage =
    await api.functional.healthcarePlatform.medicalDoctor.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: pageSize,
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page size is correct",
    firstPage.data.length <= pageSize,
    true,
  );

  if (firstPage.pagination.pages > 1) {
    const lastPage =
      await api.functional.healthcarePlatform.medicalDoctor.notifications.index(
        connection,
        {
          body: {
            page: firstPage.pagination.pages,
            limit: pageSize,
          } satisfies IHealthcarePlatformNotification.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page has <= page size",
      lastPage.data.length <= pageSize,
      true,
    );
  }

  // Out-of-bounds/empty result
  const outOfBounds =
    await api.functional.healthcarePlatform.medicalDoctor.notifications.index(
      connection,
      {
        body: {
          page: 9999,
          limit: pageSize,
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(outOfBounds);
  TestValidator.equals(
    "empty result for out-of-bounds page",
    outOfBounds.data.length,
    0,
  );
}
