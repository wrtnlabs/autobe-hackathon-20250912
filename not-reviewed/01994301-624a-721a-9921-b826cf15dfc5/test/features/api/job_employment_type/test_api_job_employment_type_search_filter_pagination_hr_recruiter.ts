import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobEmploymentType";

/**
 * Validates the HR recruiter's ability to use advanced search, filter, and
 * pagination on job employment types.
 *
 * Business context: HR recruiters need to efficiently locate and review job
 * employment type entries (e.g., full-time, part-time, contract, etc.) via
 * powerful querying.
 *
 * Steps:
 *
 * 1. Authenticate as an HR recruiter and create several employment types with
 *    diverse properties
 * 2. Search, filter, and paginate as HR recruiter (success)
 *
 *    - Filter by is_active
 *    - Search by partial name
 *    - Paginate with custom limit/page
 *    - Search for zero-result edge case
 * 3. Validate returned data fields and pagination structure
 * 4. Attempt search/pagination as unauthenticated user (failure - permission
 *    enforcement)
 */
export async function test_api_job_employment_type_search_filter_pagination_hr_recruiter(
  connection: api.IConnection,
) {
  // 1. HR recruiter registration (authentication)
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterJoinInput = {
    email: recruiterEmail,
    password: "password123",
    name: RandomGenerator.name(),
    department: RandomGenerator.name(1),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: recruiterJoinInput,
    });
  typia.assert(recruiter);

  // 2. Create several job employment types with diverse names/activeness
  const jobTypesData = [
    { name: "Full-Time", description: "Permanent position", is_active: true },
    { name: "Part-Time", description: "Flexible schedule", is_active: true },
    {
      name: "Contractor",
      description: "Short-term contract",
      is_active: false,
    },
    {
      name: "Internship",
      description: "Limited duration internship",
      is_active: true,
    },
    {
      name: "Temp",
      description: "Temporary/seasonal position",
      is_active: false,
    },
  ];
  const jobTypes: IAtsRecruitmentJobEmploymentType[] = [];
  for (const jt of jobTypesData) {
    const created =
      await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
        connection,
        { body: jt satisfies IAtsRecruitmentJobEmploymentType.ICreate },
      );
    typia.assert(created);
    jobTypes.push(created);
  }

  // 3. Filter: Only is_active == true
  const activeResult =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.index(
      connection,
      { body: { is_active: true } },
    );
  typia.assert(activeResult);
  TestValidator.predicate(
    "all types in is_active==true search are active",
    activeResult.data.every((x) => x.is_active === true),
  );

  // 4. Partial match search (e.g. 'Par' matches 'Part-Time')
  const partialNameTerm = "Par";
  const nameSearchResult =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.index(
      connection,
      { body: { search: partialNameTerm } },
    );
  typia.assert(nameSearchResult);
  TestValidator.predicate(
    "all found job types for partial name contain search term",
    nameSearchResult.data.every((x) =>
      x.name.toLowerCase().includes(partialNameTerm.toLowerCase()),
    ),
  );

  // 5. Pagination: limit = 2, page = 1
  const limit = 2;
  const page1Result =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.index(
      connection,
      { body: { limit, page: 1 } },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "requested page1 limit met",
    page1Result.data.length,
    limit,
  );
  TestValidator.equals(
    "pagination current matches page 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches requested",
    page1Result.pagination.limit,
    limit,
  );

  // 6. Zero-result edge case: search for non-existent name
  const zeroResultTerm = RandomGenerator.alphaNumeric(16);
  const zeroResult =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.index(
      connection,
      { body: { search: zeroResultTerm } },
    );
  typia.assert(zeroResult);
  TestValidator.equals(
    "no result for nonexistent name search",
    zeroResult.data.length,
    0,
  );
  TestValidator.equals(
    "zero-result pagination records is 0",
    zeroResult.pagination.records,
    0,
  );

  // 7. Permissions: error on unauthenticated search attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated recruiter cannot search job employment types",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.index(
        unauthConn,
        { body: {} },
      );
    },
  );
}
