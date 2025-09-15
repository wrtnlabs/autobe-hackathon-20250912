import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdminNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerAdminNotification";

/**
 * Test the listing of admin notifications with detailed filtering and
 * pagination.
 *
 * Steps:
 *
 * 1. Authenticate an admin user using /auth/admin/join API.
 * 2. Use the authenticated admin's id to construct filter conditions.
 * 3. Send filtered list requests with various combinations of is_read flags
 *    (read/unread) and date-time ranges for created_at, updated_at, and
 *    deleted_at.
 * 4. Validate that only notifications matching the filters and belonging to
 *    the authenticated admin are returned.
 * 5. Validate the paginated response metadata consistency.
 * 6. Test unauthorized access attempts return errors.
 * 7. Validate type assertions for all responses.
 */
export async function test_api_oauth_server_admin_notification_list_with_filters(
  connection: api.IConnection,
) {
  // 1. Admin join / authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "password123";

  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // Extract admin.id for use in filters
  const adminId: string & tags.Format<"uuid"> = typia.assert(admin.id);

  // Current time ISO string reference
  const nowIso = new Date().toISOString();

  // 2. Basic notification filter - no filtering except admin_id
  const basicFilterBody = {
    admin_id: adminId,
    title: "",
    message: "",
    is_read: false,
    created_at: null,
    updated_at: null,
    deleted_at: null,
  } satisfies IOauthServerAdminNotification.IRequest;

  const basicList: IPageIOauthServerAdminNotification =
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.index(
      connection,
      { body: basicFilterBody },
    );
  typia.assert(basicList);

  TestValidator.predicate(
    "pagination current and limit are non-negative",
    basicList.pagination.current >= 0 && basicList.pagination.limit >= 0,
  );
  TestValidator.equals(
    "admin id in each notification",
    basicList.data.map((notif) => notif.admin_id),
    ArrayUtil.repeat(basicList.data.length, () => adminId),
  );

  // 3. Filter by is_read true (read notifications only)
  const readFilterBody = {
    admin_id: adminId,
    title: "",
    message: "",
    is_read: true,
    created_at: null,
    updated_at: null,
    deleted_at: null,
  } satisfies IOauthServerAdminNotification.IRequest;

  const readList: IPageIOauthServerAdminNotification =
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.index(
      connection,
      { body: readFilterBody },
    );
  typia.assert(readList);
  TestValidator.predicate(
    "all notifications are marked read",
    readList.data.every((notif) => notif.is_read === true),
  );

  // 4. Filter by date range for created_at:
  // created_at within last 30 days
  const date30DaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateNow = nowIso;

  const createdAtFilterBody = {
    admin_id: adminId,
    title: "",
    message: "",
    is_read: false,
    created_at: date30DaysAgo,
    updated_at: null,
    deleted_at: null,
  } satisfies IOauthServerAdminNotification.IRequest;

  const createdAtList: IPageIOauthServerAdminNotification =
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.index(
      connection,
      { body: createdAtFilterBody },
    );
  typia.assert(createdAtList);
  TestValidator.predicate(
    "each notification created_at is recent",
    createdAtList.data.every(
      (notif) =>
        notif.created_at >= date30DaysAgo && notif.created_at <= dateNow,
    ),
  );

  // 5. Filter by deleted_at is null (active notifications)
  const notDeletedFilterBody = {
    admin_id: adminId,
    title: "",
    message: "",
    is_read: false,
    created_at: null,
    updated_at: null,
    deleted_at: null,
  } satisfies IOauthServerAdminNotification.IRequest;

  const activeList: IPageIOauthServerAdminNotification =
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.index(
      connection,
      { body: notDeletedFilterBody },
    );
  typia.assert(activeList);
  TestValidator.predicate(
    `all notifications have deleted_at as null`,
    activeList.data.every(
      (notif) => notif.deleted_at === null || notif.deleted_at === undefined,
    ),
  );

  // 6. Test unauthorized access: Use a fresh connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized access denied", async () => {
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.index(
      unauthConn,
      { body: basicFilterBody },
    );
  });

  // End of tests
}
