import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobEmploymentType";

/**
 * E2E test for system admin's search and list functionality of job
 * employment types.
 *
 * 1. Register a system admin account (join)
 * 2. Login as the system admin to get authentication
 * 3. (Precondition) Assume job employment type records exist, or create a few
 *    test records if necessary (if writable endpoint exists; otherwise,
 *    skip creation)
 * 4. Call PATCH /atsRecruitment/systemAdmin/jobEmploymentTypes as
 *    authenticated admin:
 *
 * - A) List all (unfiltered) and check pagination.total >= 0
 * - B) Filter by is_active = true, expect only active types in result
 * - C) Use 'search' parameter for name keyword; verify all results contain
 *   the keyword in name/description
 * - D) Filter by created_from and created_to to get types in a specific time
 *   window
 * - E) Test ordering: order_by 'name', order_dir 'asc'/'desc'; ensure order
 *   is consistent across pages
 * - F) Pagination: limit and page, confirm returned records,
 *   current/limit/page metadata are correct
 *
 * 5. Call endpoint without authentication and expect 401 (unauthorized) error
 * 6. If API permits, ensure soft-deleted (deleted_at set) types are not
 *    included in results, by creating such data if possible or stating the
 *    check is not possible in the test
 * 7. For all checks, validate via TestValidator predicates and equality tests,
 *    and ensure typia.assert on all API responses/results
 */
export async function test_api_job_employment_type_list_with_various_filters(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Login as system admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  typia.assert(loginResult);

  // 3. Assume multiple job employment type records exist, but since there is no endpoint for creation here, skip creation

  // 4a. List all (unfiltered)
  const allResult =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.index(
      connection,
      {
        body: {} satisfies IAtsRecruitmentJobEmploymentType.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "total records non-negative",
    allResult.pagination.records >= 0,
  );
  // All results must not be soft-deleted (deleted_at null or undefined)
  allResult.data.forEach((e) =>
    TestValidator.equals("employment type not deleted", e.deleted_at, null),
  );

  // 4b. Filter by is_active=true
  const activeResult =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.index(
      connection,
      {
        body: {
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.IRequest,
      },
    );
  typia.assert(activeResult);
  activeResult.data.forEach((e) =>
    TestValidator.equals("all employment types are active", e.is_active, true),
  );

  // 4c. Search by keyword in name/description (sample using name from first in allResult, fallback random if none exist)
  let searchKeyword =
    allResult.data.length > 0
      ? RandomGenerator.substring(allResult.data[0].name)
      : RandomGenerator.paragraph({ sentences: 1 });
  const searchResult =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.index(
      connection,
      {
        body: {
          search: searchKeyword,
        } satisfies IAtsRecruitmentJobEmploymentType.IRequest,
      },
    );
  typia.assert(searchResult);
  searchResult.data.forEach((e) =>
    TestValidator.predicate(
      "search match in name/description",
      e.name.includes(searchKeyword) ||
        (e.description ?? "").includes(searchKeyword),
    ),
  );

  // 4d. Filter by creation date range (created_from / created_to)
  if (allResult.data.length > 0) {
    const minCreated = allResult.data.reduce(
      (min, e) => (min < e.created_at ? min : e.created_at),
      allResult.data[0].created_at,
    );
    const maxCreated = allResult.data.reduce(
      (max, e) => (max > e.created_at ? max : e.created_at),
      allResult.data[0].created_at,
    );
    const rangeResult =
      await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.index(
        connection,
        {
          body: {
            created_from: minCreated,
            created_to: maxCreated,
          } satisfies IAtsRecruitmentJobEmploymentType.IRequest,
        },
      );
    typia.assert(rangeResult);
    rangeResult.data.forEach((e) =>
      TestValidator.predicate(
        "created_at in range",
        e.created_at >= minCreated && e.created_at <= maxCreated,
      ),
    );
  }

  // 4e. Test ordering by name ascending/descending
  const ascResult =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.index(
      connection,
      {
        body: {
          order_by: "name",
          order_dir: "asc",
        } satisfies IAtsRecruitmentJobEmploymentType.IRequest,
      },
    );
  typia.assert(ascResult);
  for (let i = 1; i < ascResult.data.length; ++i) {
    TestValidator.predicate(
      "asc order by name",
      ascResult.data[i - 1].name <= ascResult.data[i].name,
    );
  }
  const descResult =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.index(
      connection,
      {
        body: {
          order_by: "name",
          order_dir: "desc",
        } satisfies IAtsRecruitmentJobEmploymentType.IRequest,
      },
    );
  typia.assert(descResult);
  for (let i = 1; i < descResult.data.length; ++i) {
    TestValidator.predicate(
      "desc order by name",
      descResult.data[i - 1].name >= descResult.data[i].name,
    );
  }

  // 4f. Pagination: limit=2, page=1 & 2
  const paged1 =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.index(
      connection,
      {
        body: {
          limit: 2,
          page: 1,
        } satisfies IAtsRecruitmentJobEmploymentType.IRequest,
      },
    );
  typia.assert(paged1);
  TestValidator.equals(
    "pagination current page 1",
    paged1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit 2", paged1.pagination.limit, 2);
  if (paged1.pagination.pages > 1) {
    const paged2 =
      await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.index(
        connection,
        {
          body: {
            limit: 2,
            page: 2,
          } satisfies IAtsRecruitmentJobEmploymentType.IRequest,
        },
      );
    typia.assert(paged2);
    TestValidator.equals(
      "pagination current page 2",
      paged2.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination limit 2 [page 2]",
      paged2.pagination.limit,
      2,
    );
    // Ensure results between pages do not overlap
    const page1Ids = paged1.data.map((e) => e.id);
    paged2.data.forEach((e) =>
      TestValidator.predicate(
        "employment type not on previous page",
        !page1Ids.includes(e.id),
      ),
    );
  }

  // 5. Call endpoint without authentication, expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized request rejected", async () => {
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.index(
      unauthConn,
      {
        body: {} satisfies IAtsRecruitmentJobEmploymentType.IRequest,
      },
    );
  });

  // 6. Soft-deleted records not included: cannot create soft-deleted for this test as no create/delete endpoint is present, so only assert that all results have deleted_at=null
  allResult.data.forEach((e) =>
    TestValidator.equals("not soft deleted", e.deleted_at, null),
  );
  activeResult.data.forEach((e) =>
    TestValidator.equals("not soft deleted (active)", e.deleted_at, null),
  );
  searchResult.data.forEach((e) =>
    TestValidator.equals("not soft deleted (search)", e.deleted_at, null),
  );
  ascResult.data.forEach((e) =>
    TestValidator.equals("not soft deleted (asc order)", e.deleted_at, null),
  );
  descResult.data.forEach((e) =>
    TestValidator.equals("not soft deleted (desc order)", e.deleted_at, null),
  );
  paged1.data.forEach((e) =>
    TestValidator.equals("not soft deleted (paged1)", e.deleted_at, null),
  );
}
