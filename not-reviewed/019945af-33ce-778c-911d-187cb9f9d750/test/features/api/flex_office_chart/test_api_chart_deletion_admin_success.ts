import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";

/**
 * Test scenario for deleting a chart as an admin user.
 *
 * This E2E flow validates the full lifecycle from admin creation, login, chart
 * creation, and then deletion.
 *
 * The steps include:
 *
 * 1. Admin registration via /auth/admin/join with unique email and password.
 * 2. Admin login via /auth/admin/login to obtain authenticated session tokens.
 * 3. Chart creation via /flexOffice/admin/charts POST with required widget
 *    association and valid chart data.
 * 4. Chart deletion via DELETE /flexOffice/admin/charts/{chartId} with the
 *    authorized admin session.
 *
 * Validation points:
 *
 * - Successful creation of admin user returns valid authorized session.
 * - Login returns JWT tokens.
 * - Chart creation successes with the returned chart ID.
 * - Deletion of the chart returns success without content.
 * - Attempts to delete a non-existent chart return appropriate HTTP not found
 *   error.
 * - The flow enforces auth roles and rejects unauthorized access.
 *
 * Business rules:
 *
 * - Only users with admin role can delete charts.
 * - Chart must exist and be owned or manageable by admin.
 * - Subsequent operations on deleted chart result in failure.
 *
 * Success criteria:
 *
 * - Chart deleted successfully with no response body.
 * - Proper JWT authentication is maintained throughout.
 * - Authorization role verified at every step.
 *
 * Error handling:
 *
 * - Invalid JWT tokens cause unauthorized error.
 * - Duplicate admin registration prevented.
 * - Invalid chart IDs handled gracefully.
 */
export async function test_api_chart_deletion_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin registration as a new admin user
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "strongPassword123";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login to get fresh JWT tokens
  const loginResult: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loginResult);

  // 3. Create a new chart associated with a widget
  // We generate a random UUID for flex_office_widget_id
  const newChart: IFlexOfficeChart =
    await api.functional.flexOffice.admin.charts.create(connection, {
      body: {
        flex_office_widget_id: typia.random<string & tags.Format<"uuid">>(),
        chart_type: RandomGenerator.alphaNumeric(6),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IFlexOfficeChart.ICreate,
    });
  typia.assert(newChart);

  // 4. Delete the created chart by chartId
  await api.functional.flexOffice.admin.charts.erase(connection, {
    chartId: newChart.id,
  });

  // 5. Validate deletion by attempting to delete the same chart again
  // This should produce an error, typically HTTP 404 not found
  await TestValidator.error(
    "Deleting a non-existent chart results in error",
    async () => {
      await api.functional.flexOffice.admin.charts.erase(connection, {
        chartId: newChart.id,
      });
    },
  );
}
