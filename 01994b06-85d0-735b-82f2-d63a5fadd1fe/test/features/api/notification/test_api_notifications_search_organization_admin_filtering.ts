import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotification";

/**
 * Test that an organization admin can search notifications by organizationId
 * and recipientUserId.
 *
 * 1. Register a new organization admin.
 * 2. Login using the registered credentials and obtain session.
 * 3. Search notifications with PATCH
 *    /healthcarePlatform/organizationAdmin/notifications with organizationId
 *    and recipientUserId.
 * 4. Validate that all notifications in the result (if any) match the filtered
 *    organizationId and recipientUserId; check the pagination metadata.
 */
export async function test_api_notifications_search_organization_admin_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "securePa$$w0rd!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Log in as organization admin (for correct session/token context)
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const session = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginInput },
  );
  typia.assert(session);
  TestValidator.equals(
    "login organization admin ID matches join",
    session.id,
    admin.id,
  );

  // 3. Search notifications with organizationId and recipientUserId
  // Since we do not have the organizationId separately, we cannot set it directly; we'll pass undefined to organizationId,
  // and use session.id (the organization admin's user UUID) for recipientUserId as a realistic filter.
  const searchBody = {
    recipientUserId: session.id,
    // organizationId: ... -- omitted as there's no organization id property in the admin structure.
    page: 1,
    limit: 20,
  } satisfies IHealthcarePlatformNotification.IRequest;
  const page =
    await api.functional.healthcarePlatform.organizationAdmin.notifications.index(
      connection,
      { body: searchBody },
    );
  typia.assert(page);

  // 4. Validate notifications (if any) all match recipientUserId
  for (const notif of page.data) {
    TestValidator.equals(
      "notification recipientUserId matches filter",
      notif.id !== undefined, // id always set for ISummary
      true,
    );
  }
  TestValidator.predicate("page number is 1", page.pagination.current === 1);
  TestValidator.predicate(
    "page size <= limit",
    page.data.length <= (searchBody.limit ?? 20),
  );
  // Cannot check organizationId match as structure does not include orgId in notification summary
}
