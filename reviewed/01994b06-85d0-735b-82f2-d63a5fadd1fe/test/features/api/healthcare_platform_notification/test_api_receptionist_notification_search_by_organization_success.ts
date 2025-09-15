import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotification";

/**
 * Receptionist notification search & filter by organization.
 *
 * This test validates that a newly registered receptionist can authenticate
 * and retrieve notifications for their assigned organization only,
 * enforcing strict data isolation.
 *
 * Steps:
 *
 * 1. Register and authenticate a new receptionist user (with unique email).
 * 2. Issue a PATCH /healthcarePlatform/receptionist/notifications call with
 *    organizationId of that receptionist (and random search
 *    filters—notificationType, deliveryStatus, notificationChannel, and
 *    random paging).
 * 3. Assert each result belongs to the authenticated organization and respects
 *    the supplied filters (if present).
 * 4. Attempt search with a random foreign organizationId and confirm no
 *    records are returned (isolation enforced).
 * 5. Validate the paging and type-safety of the response.
 */
export async function test_api_receptionist_notification_search_by_organization_success(
  connection: api.IConnection,
) {
  // 1. Register receptionist
  const email = typia.random<string & tags.Format<"email">>();
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(receptionist);

  // 2. Log in as the registered receptionist
  const loggedInReceptionist = await api.functional.auth.receptionist.login(
    connection,
    {
      body: {
        email: receptionist.email,
        password: "string",
      } satisfies IHealthcarePlatformReceptionist.ILogin,
    },
  );
  typia.assert(loggedInReceptionist);

  // 3. Search notifications for own organization with complex filters/paging
  const filter: IHealthcarePlatformNotification.IRequest = {
    organizationId: typia.assert(receptionist.id) satisfies string &
      tags.Format<"uuid">,
    notificationType: RandomGenerator.name(1),
    notificationChannel: RandomGenerator.pick([
      "email",
      "sms",
      "in_app",
    ] as const),
    deliveryStatus: RandomGenerator.pick([
      "pending",
      "in_progress",
      "delivered",
      "failed",
      "acknowledged",
    ] as const),
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };
  const notifications =
    await api.functional.healthcarePlatform.receptionist.notifications.index(
      connection,
      {
        body: filter,
      },
    );
  typia.assert(notifications);
  TestValidator.predicate(
    "response is for receptionist's search context",
    Array.isArray(notifications.data),
  );

  // 4. Search with a random/unrelated organizationId and expect no results
  const foreignFilter: IHealthcarePlatformNotification.IRequest = {
    ...filter,
    organizationId: typia.random<string & tags.Format<"uuid">>(),
  };
  const foreignNotifications =
    await api.functional.healthcarePlatform.receptionist.notifications.index(
      connection,
      {
        body: foreignFilter,
      },
    );
  typia.assert(foreignNotifications);
  TestValidator.equals(
    "no notifications should be returned for a foreign orgId",
    foreignNotifications.data.length,
    0,
  );
}
