import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobPostingState";

/**
 * System administrator can perform paginated, filtered, and sorted queries for
 * job posting state listing (PATCH
 * /atsRecruitment/systemAdmin/jobPostingStates), and receives correct business
 * fields in response. Covers edge cases, empty queries, and authorization
 * errors.
 */
export async function test_api_job_posting_state_pagination_and_filtering_admin(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Login as system admin
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Query with no filters (default pagination)
  const defaultPage: IPageIAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default page has pagination info",
    typeof defaultPage.pagination === "object",
  );
  TestValidator.predicate(
    "default page data is array",
    Array.isArray(defaultPage.data),
  );

  // 4. Query with search filter (attempt to find something by label or state_code)
  if (defaultPage.data.length > 0) {
    const targetState = defaultPage.data[0];
    const searchQuery = RandomGenerator.substring(targetState.label);

    const filterPage =
      await api.functional.atsRecruitment.systemAdmin.jobPostingStates.index(
        connection,
        {
          body: {
            search: searchQuery,
          } satisfies IAtsRecruitmentJobPostingState.IRequest,
        },
      );
    typia.assert(filterPage);
    TestValidator.predicate(
      "filtered result includes at least partial match",
      filterPage.data.some(
        (s) =>
          s.label.includes(searchQuery) || s.state_code.includes(searchQuery),
      ),
    );
  }

  // 5. Query by is_active: true/false
  for (const isActive of [true, false]) {
    const page =
      await api.functional.atsRecruitment.systemAdmin.jobPostingStates.index(
        connection,
        {
          body: {
            is_active: isActive,
          } satisfies IAtsRecruitmentJobPostingState.IRequest,
        },
      );
    typia.assert(page);
    TestValidator.predicate(
      `all results have is_active=${isActive}`,
      page.data.every((s) => s.is_active === isActive),
    );
  }

  // 6. Query by non-existent state_code to produce empty results
  const emptyPage =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.index(
      connection,
      {
        body: { state_codes: ["ZZZ_UNKNOWN_CODE"] },
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty data array for unknown code",
    emptyPage.data.length,
    0,
  );

  // 7. Pagination test: page/limit parameters
  const paginationPage =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.index(
      connection,
      {
        body: {
          page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
          limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(paginationPage);
  TestValidator.equals(
    "page=0, limit=2 returns up to 2 results",
    paginationPage.data.length,
    Math.min(2, paginationPage.pagination.records),
  );

  // 8. Sorting test: order_by and order_dir (asc/desc by sort_order)
  for (const order_dir of ["asc", "desc"] as const) {
    const sortPage =
      await api.functional.atsRecruitment.systemAdmin.jobPostingStates.index(
        connection,
        {
          body: {
            order_by: "sort_order",
            order_dir,
          } satisfies IAtsRecruitmentJobPostingState.IRequest,
        },
      );
    typia.assert(sortPage);
    const sorted = [...sortPage.data];
    sorted.sort((a, b) =>
      order_dir === "asc"
        ? a.sort_order - b.sort_order
        : b.sort_order - a.sort_order,
    );
    TestValidator.equals(
      `results sorted by sort_order ${order_dir}`,
      sortPage.data.map((s) => s.id),
      sorted.map((s) => s.id),
    );
  }

  // 9. Attempt access without authentication (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("reject unauthenticated access", async () => {
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.index(
      unauthConn,
      {
        body: {},
      },
    );
  });
}
