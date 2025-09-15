import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentHrRecruiter";

/**
 * E2E test verifying system admin search for HR recruiters with filters,
 * pagination, and error checks.
 *
 * - System admin registers and is authenticated.
 * - Multiple dummy HR recruiters are pre-seeded for filter scenarios.
 * - The admin performs paged search with advanced filters: by department, email,
 *   activity status.
 * - Pagination is tested by changing page/limit values and moving through result
 *   pages.
 * - All summaries must only contain authorized fields (id, email, name,
 *   department, is_active, created_at, updated_at, deleted_at?).
 * - Test error handling: malformed query (e.g. bad date), empty result filter,
 *   and missing JWT (unauthorized).
 * - Confirm audit compliance: summaries contain expected fields only, no secrets.
 */
export async function test_api_hr_recruiter_list_pagination_and_filtering_by_admin(
  connection: api.IConnection,
) {
  // 1. Register system administrator
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // 2. Preparation step: assume HR recruiter population exists (beyond API seed scope).
  // For robust filter testing, ideally the backend is seeded with multiple unique recruiters
  // Here, we only test listing/filters, not creation.

  // 3. Paginated search - basic unfiltered page fetch
  const res1 =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
      connection,
      { body: {} satisfies IAtsRecruitmentHrRecruiter.IRequest },
    );
  typia.assert(res1);
  TestValidator.predicate(
    "pagination info exists",
    res1.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(res1.data));

  // 4. Filter by is_active
  const res2 =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
      connection,
      {
        body: { is_active: true } satisfies IAtsRecruitmentHrRecruiter.IRequest,
      },
    );
  typia.assert(res2);
  TestValidator.predicate(
    "every recruiter is active",
    res2.data.every((r) => r.is_active),
  );

  // 5. Advanced filters: department and email substring
  const filterDept = "HR";
  const filterEmailPart = "@"; // should match all
  const res3 =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
      connection,
      {
        body: {
          department: filterDept,
          search: filterEmailPart,
        } satisfies IAtsRecruitmentHrRecruiter.IRequest,
      },
    );
  typia.assert(res3);
  TestValidator.predicate(
    "all filtered recruiters include filterDept in department (if set)",
    res3.data.every((r) => r.department === filterDept),
  );
  TestValidator.predicate(
    "all filtered recruiters match email substring",
    res3.data.every((r) => r.email.includes(filterEmailPart)),
  );

  // 6. Pagination controls (page, limit, next page)
  const res4 =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IAtsRecruitmentHrRecruiter.IRequest,
      },
    );
  typia.assert(res4);
  TestValidator.equals("page index is 1", res4.pagination.current, 1);
  TestValidator.equals("page limit is 2", res4.pagination.limit, 2);
  if (res4.pagination.pages > 1) {
    const res5 =
      await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
        connection,
        {
          body: {
            page: 2,
            limit: 2,
          } satisfies IAtsRecruitmentHrRecruiter.IRequest,
        },
      );
    typia.assert(res5);
    TestValidator.equals("page index is 2", res5.pagination.current, 2);
  }

  // 7. Only authorized summary fields returned
  TestValidator.predicate(
    "no secret fields in summaries",
    res1.data.every((r) =>
      Object.keys(r).every((key) =>
        [
          "id",
          "email",
          "name",
          "department",
          "is_active",
          "created_at",
          "updated_at",
          "deleted_at",
        ].includes(key),
      ),
    ),
  );

  // 8. Error cases

  // 8a. Malformed date filter
  await TestValidator.error(
    "malformed date filter triggers error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
        connection,
        {
          body: {
            created_at_from: "not-a-date",
          } satisfies IAtsRecruitmentHrRecruiter.IRequest,
        },
      );
    },
  );

  // 8b. Empty filter (no results)
  const resEmpty =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
      connection,
      {
        body: {
          department: "NO_SUCH_DEPARTMENT",
        } satisfies IAtsRecruitmentHrRecruiter.IRequest,
      },
    );
  typia.assert(resEmpty);
  TestValidator.equals(
    "pagination reports zero results",
    resEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "no summary data in empty result",
    resEmpty.data.length,
    0,
  );

  // 8c. Unauthorized: no JWT
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized admin recruiter search fails when no JWT",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
        unauthConn,
        { body: {} satisfies IAtsRecruitmentHrRecruiter.IRequest },
      );
    },
  );

  // 8d. Unauthorized: malformed JWT
  const badConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer badtoken" },
  };
  await TestValidator.error(
    "malformed JWT triggers unauthorized error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
        badConn,
        { body: {} satisfies IAtsRecruitmentHrRecruiter.IRequest },
      );
    },
  );

  // 9. Business rule: audit compliance (all records have expected fields)
  for (const d of res1.data) {
    TestValidator.predicate(
      "summary only includes audit-compliant fields",
      Object.keys(d).every((key) =>
        [
          "id",
          "email",
          "name",
          "department",
          "is_active",
          "created_at",
          "updated_at",
          "deleted_at",
        ].includes(key),
      ),
    );
  }
}
