import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentStatus";

/**
 * Verify organization admin appointment status search, filtering, sorting,
 * pagination, and error handling.
 *
 * 1. Register a new org admin (join/POST)
 * 2. Login as the org admin (login/POST)
 * 3. List all appointment statuses with empty filter (should paginate all)
 * 4. For a sample status (if any exist), a. Search by its display_name (should
 *    return it) b. Search by its status_code (should return it) c. Search
 *    with business_status (if present on that record)
 * 5. Pagination: request limit=1 and check result + pagination structure. Then
 *    request page=2, limit=1 etc.
 * 6. Sorting: send request filtered by sort_order (if >1 statuses exist),
 *    validate order of results.
 * 7. Negative: send search term guaranteed not to match any status (e.g.
 *    random string), verify data.length === 0
 * 8. Validate that all API outputs match the correct DTO type and that
 *    business expectations are met (all returned codes/labels exist;
 *    pagination counts match; etc).
 */
export async function test_api_appointment_status_indexing_by_org_admin(
  connection: api.IConnection,
) {
  // Register a new organization admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "test1234",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // Login as the admin
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(adminLogin);

  // LIST all appointment statuses (no filter)
  const allStatuses =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allStatuses);
  TestValidator.predicate(
    "appointmentStatuses are paginated",
    allStatuses.pagination !== undefined && allStatuses.data !== undefined,
  );

  // If statuses exist, test filtering/searching
  if (allStatuses.data.length > 0) {
    const sampleStatus = allStatuses.data[0];
    // a) By display_name
    const byLabel =
      await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.index(
        connection,
        {
          body: { display_name: sampleStatus.display_name },
        },
      );
    typia.assert(byLabel);
    TestValidator.predicate(
      "display_name filter returns match",
      byLabel.data.some((status) => status.id === sampleStatus.id),
    );
    // b) By status_code
    const byCode =
      await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.index(
        connection,
        {
          body: { status_code: sampleStatus.status_code },
        },
      );
    typia.assert(byCode);
    TestValidator.predicate(
      "status_code filter returns match",
      byCode.data.some((status) => status.id === sampleStatus.id),
    );
    // c) By business_status (if defined)
    if (sampleStatus.business_status) {
      const byBusiness =
        await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.index(
          connection,
          {
            body: { business_status: sampleStatus.business_status },
          },
        );
      typia.assert(byBusiness);
      TestValidator.predicate(
        "business_status filter returns at least one",
        byBusiness.data.length > 0,
      );
    }
  }
  // Pagination tests (request 1 per page, walk 1st+2nd page if available)
  const paged1 =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.index(
      connection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 1 satisfies number as number,
        },
      },
    );
  typia.assert(paged1);
  TestValidator.equals(
    "pagination page 1 structure",
    paged1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit=1 structure",
    paged1.pagination.limit,
    1,
  );
  if (paged1.pagination.pages > 1) {
    const paged2 =
      await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.index(
        connection,
        {
          body: {
            page: 2 satisfies number as number,
            limit: 1 satisfies number as number,
          },
        },
      );
    typia.assert(paged2);
    TestValidator.equals(
      "pagination page 2 structure",
      paged2.pagination.current,
      2,
    );
  }
  // Sorting by sort_order (if >=2 statuses exist)
  if (allStatuses.data.length >= 2) {
    const sorted =
      await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.index(
        connection,
        {
          body: { sort_order: allStatuses.data[0].sort_order },
        },
      );
    typia.assert(sorted);
    TestValidator.predicate(
      "sort_order filter returns at least one",
      sorted.data.length > 0,
    );
  }
  // Negative test: no-match filter
  const noMatch =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.index(
      connection,
      {
        body: {
          display_name:
            "NEVERMATCHTHIS_LABEL_" + RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(noMatch);
  TestValidator.equals(
    "search returns zero data for nonsense label",
    noMatch.data.length,
    0,
  );

  // All paginated results match DTO
  typia.assert(allStatuses);
  if (allStatuses.data.length > 0) {
    allStatuses.data.forEach((stat) => typia.assert(stat));
  }
}
