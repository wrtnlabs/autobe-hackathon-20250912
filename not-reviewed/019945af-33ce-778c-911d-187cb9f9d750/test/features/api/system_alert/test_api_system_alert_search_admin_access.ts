import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemAlert";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeSystemAlert";

export async function test_api_system_alert_search_admin_access(
  connection: api.IConnection,
) {
  // 1. Admin user creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Password123!";

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IFlexOfficeAdmin.ICreate,
  });
  typia.assert(createdAdmin);

  // 2. Admin user login
  const loggedInAdmin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IFlexOfficeAdmin.ILogin,
  });
  typia.assert(loggedInAdmin);

  // 3. System alert search - no filter (default pagination)
  const allAlerts = await api.functional.flexOffice.admin.systemAlerts.index(
    connection,
    { body: {} satisfies IFlexOfficeSystemAlert.IRequest },
  );
  typia.assert(allAlerts);

  TestValidator.predicate(
    "pagination current page is at least 1",
    allAlerts.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    allAlerts.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    allAlerts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is at least 1",
    allAlerts.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "Data array is present",
    Array.isArray(allAlerts.data),
  );

  // 4. System alert search - filter by severity using possible string values
  const severityExample =
    allAlerts.data.length > 0 ? allAlerts.data[0].severity : "info";
  const alertsBySeverity =
    await api.functional.flexOffice.admin.systemAlerts.index(connection, {
      body: {
        severity: severityExample,
      } satisfies IFlexOfficeSystemAlert.IRequest,
    });
  typia.assert(alertsBySeverity);
  if (alertsBySeverity.data.length > 0) {
    TestValidator.predicate(
      "All results match requested severity",
      alertsBySeverity.data.every(
        (alert) => alert.severity === severityExample,
      ),
    );
  }

  // 5. System alert search - filter by resolution status
  const unresolvedAlerts =
    await api.functional.flexOffice.admin.systemAlerts.index(connection, {
      body: {
        is_resolved: false,
      } satisfies IFlexOfficeSystemAlert.IRequest,
    });
  typia.assert(unresolvedAlerts);
  if (unresolvedAlerts.data.length > 0) {
    TestValidator.predicate(
      "All alerts are unresolved",
      unresolvedAlerts.data.every((alert) => alert.is_resolved === false),
    );
  }

  // 6. System alert search - filter by created_after and created_before
  if (allAlerts.data.length >= 2) {
    const createdAfter = allAlerts.data[0].created_at;
    const createdBefore = allAlerts.data[allAlerts.data.length - 1].created_at;

    // Ensure ISO8601 format and createdBefore > createdAfter (typia.assert covers format)
    typia.assert(createdAfter);
    typia.assert(createdBefore);

    const alertsDroppedByDate =
      await api.functional.flexOffice.admin.systemAlerts.index(connection, {
        body: {
          created_after: createdAfter,
          created_before: createdBefore,
        } satisfies IFlexOfficeSystemAlert.IRequest,
      });
    typia.assert(alertsDroppedByDate);

    TestValidator.predicate(
      "All alerts created after or same as created_after",
      alertsDroppedByDate.data.every(
        (alert) => alert.created_at >= createdAfter,
      ),
    );
    TestValidator.predicate(
      "All alerts created before or same as created_before",
      alertsDroppedByDate.data.every(
        (alert) => alert.created_at <= createdBefore,
      ),
    );
  }

  // 7. System alert search - with pagination parameters
  const pageNumber = 1;
  const limitNumber = 2;
  const pagedAlerts = await api.functional.flexOffice.admin.systemAlerts.index(
    connection,
    {
      body: {
        page: pageNumber,
        limit: limitNumber,
      } satisfies IFlexOfficeSystemAlert.IRequest,
    },
  );
  typia.assert(pagedAlerts);
  TestValidator.equals(
    "Pagination page equals requested page",
    pagedAlerts.pagination.current,
    pageNumber,
  );
  TestValidator.equals(
    "Pagination limit equals requested limit",
    pagedAlerts.pagination.limit,
    limitNumber,
  );
  TestValidator.predicate(
    "Data length equals limit or less",
    pagedAlerts.data.length <= limitNumber,
  );

  // 8. Attempt unauthenticated access
  // Create a new connection with no headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("Unauthenticated access should fail", async () => {
    await api.functional.flexOffice.admin.systemAlerts.index(
      unauthenticatedConnection,
      {
        body: {} satisfies IFlexOfficeSystemAlert.IRequest,
      },
    );
  });
}
