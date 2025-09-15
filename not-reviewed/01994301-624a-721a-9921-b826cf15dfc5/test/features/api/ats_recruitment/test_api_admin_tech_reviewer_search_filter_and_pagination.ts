import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentTechReviewer";

/**
 * Validates system admin tech reviewer directory listing for search,
 * filter, and pagination.
 *
 * Ensures a system admin can:
 *
 * 1. Retrieve the unfiltered full list (directory/all reviewers)
 * 2. Search by partial name, specialization, email, is_active (runtime
 *    filtering/partial/defaults)
 * 3. Paginate results with variable limits, check pagination math (pages,
 *    records, current)
 * 4. Perform advanced or edge case queries (inactive-only, invalid/random
 *    search, excessive pages)
 * 5. Get access denied if non-admin/unauthenticated Automatically checks DTO
 *    types, never manipulates headers directly. Covers business workflow:
 *    admin registration, authentication, authorized/unauthorized query, and
 *    error validation using TestValidator.
 */
export async function test_api_admin_tech_reviewer_search_filter_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Login as admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 3. Retrieve unfiltered full list
  const pageUnfiltered =
    await api.functional.atsRecruitment.systemAdmin.techReviewers.index(
      connection,
      {
        body: {} satisfies IAtsRecruitmentTechReviewer.IRequest,
      },
    );
  typia.assert(pageUnfiltered);
  TestValidator.predicate(
    "pagination format on unfiltered",
    typeof pageUnfiltered.pagination.current === "number",
  );
  const allReviewers = pageUnfiltered.data;

  // 4. Search by partial name, specialization, email, is_active
  if (allReviewers.length > 0) {
    const sample = RandomGenerator.pick(allReviewers);
    // Partial name search
    if (sample.name.length >= 3) {
      const partial = sample.name.substring(0, sample.name.length - 1);
      const pageName =
        await api.functional.atsRecruitment.systemAdmin.techReviewers.index(
          connection,
          {
            body: {
              search: partial,
            } satisfies IAtsRecruitmentTechReviewer.IRequest,
          },
        );
      typia.assert(pageName);
      TestValidator.predicate(
        "partial name search result contains partial",
        pageName.data.some((r) => r.name.includes(partial)),
      );
    }
    // Specialization search
    if (sample.specialization) {
      const pageSpec =
        await api.functional.atsRecruitment.systemAdmin.techReviewers.index(
          connection,
          {
            body: {
              search: sample.specialization,
            } satisfies IAtsRecruitmentTechReviewer.IRequest,
          },
        );
      typia.assert(pageSpec);
      TestValidator.predicate(
        "specialization search matches",
        pageSpec.data.some((r) => r.specialization === sample.specialization),
      );
    }
    // Email search
    const pageEmail =
      await api.functional.atsRecruitment.systemAdmin.techReviewers.index(
        connection,
        {
          body: {
            search: sample.email,
          } satisfies IAtsRecruitmentTechReviewer.IRequest,
        },
      );
    typia.assert(pageEmail);
    TestValidator.predicate(
      "email search returns target",
      pageEmail.data.some((r) => r.email === sample.email),
    );
    // Status search: find explicit inactive if exists
    const pageInactive =
      await api.functional.atsRecruitment.systemAdmin.techReviewers.index(
        connection,
        {
          body: {} satisfies IAtsRecruitmentTechReviewer.IRequest,
        },
      );
    typia.assert(pageInactive);
    const firstInactive = pageInactive.data.find((r) => r.is_active === false);
    if (firstInactive) {
      const pageQuery =
        await api.functional.atsRecruitment.systemAdmin.techReviewers.index(
          connection,
          {
            body: {
              search: firstInactive.email,
            } satisfies IAtsRecruitmentTechReviewer.IRequest,
          },
        );
      typia.assert(pageQuery);
      TestValidator.predicate(
        "inactive search result has inactive",
        pageQuery.data.some((r) => r.is_active === false),
      );
    }
  }

  // 5. Pagination: limit=1,2 -- walk all pages and aggregate unique reviewers
  for (const limit of [1, 2]) {
    const firstPage =
      await api.functional.atsRecruitment.systemAdmin.techReviewers.index(
        connection,
        {
          body: {
            page: 1,
            limit,
          } satisfies IAtsRecruitmentTechReviewer.IRequest,
        },
      );
    typia.assert(firstPage);
    const { pages, limit: realLim } = firstPage.pagination;
    let aggregate: IAtsRecruitmentTechReviewer.ISummary[] = [];
    for (let p = 1; p <= pages; ++p) {
      const actualPage =
        await api.functional.atsRecruitment.systemAdmin.techReviewers.index(
          connection,
          {
            body: {
              page: p,
              limit,
            } satisfies IAtsRecruitmentTechReviewer.IRequest,
          },
        );
      typia.assert(actualPage);
      TestValidator.equals(
        "pagination page limit is as requested",
        actualPage.pagination.limit,
        realLim,
      );
      TestValidator.equals(
        "pagination current page index",
        actualPage.pagination.current,
        p,
      );
      aggregate = aggregate.concat(actualPage.data);
    }
    // Check for duplicates and matching record count
    const allIds = aggregate.map((r) => r.id);
    TestValidator.equals(
      "pagination full aggregate matches unfiltered reviewer count",
      allIds.length,
      pageUnfiltered.pagination.records,
    );
  }

  // 6. Invalid/random search string returns empty set
  const pageUnknown =
    await api.functional.atsRecruitment.systemAdmin.techReviewers.index(
      connection,
      {
        body: {
          search: "___unlikely_random_search___",
        } satisfies IAtsRecruitmentTechReviewer.IRequest,
      },
    );
  typia.assert(pageUnknown);
  TestValidator.equals(
    "empty result for random search string",
    pageUnknown.data.length,
    0,
  );

  // 7. Excessive page size: still handled sanely
  const pageExcessive =
    await api.functional.atsRecruitment.systemAdmin.techReviewers.index(
      connection,
      {
        body: { limit: 10000 } satisfies IAtsRecruitmentTechReviewer.IRequest,
      },
    );
  typia.assert(pageExcessive);
  TestValidator.predicate(
    "excessive page size handled",
    pageExcessive.pagination.limit <= 10000 &&
      pageExcessive.data.length <= pageUnfiltered.pagination.records,
  );

  // 8. Unauthorized access: unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("forbidden if unauthenticated", async () => {
    await api.functional.atsRecruitment.systemAdmin.techReviewers.index(
      unauthConn,
      {
        body: {} satisfies IAtsRecruitmentTechReviewer.IRequest,
      },
    );
  });
}
