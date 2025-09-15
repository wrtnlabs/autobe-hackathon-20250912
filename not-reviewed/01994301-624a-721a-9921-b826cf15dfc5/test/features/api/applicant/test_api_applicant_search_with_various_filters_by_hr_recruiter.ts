import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicant";

/**
 * Test HR recruiter searching applicants with various filters and pagination.
 * Steps:
 *
 * 1. Register a new HR recruiter (random email, name, department).
 * 2. Authenticate as HR recruiter with correct credentials.
 * 3. Register several (5+) applicants with unique emails/names, half active, half
 *    inactive (simulate via random is_active toggling if possible).
 * 4. Search by substring in name, by active status, and paginate through results
 *    (using limit=2/page=1,2,3 etc).
 * 5. For each search, check only correct applicants are returned, paginated
 *    properly, and only summary fields shown (id, email, name, is_active).
 * 6. Search for a non-existent applicant name or email (should return zero
 *    records).
 * 7. Search with an invalid or excessive page number (should be safe/empty, not
 *    error).
 */
export async function test_api_applicant_search_with_various_filters_by_hr_recruiter(
  connection: api.IConnection,
) {
  // 1. Register a new HR recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(10);
  const recruiterName = RandomGenerator.name(2);
  const recruiterDepartment = RandomGenerator.name(1);

  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: recruiterName,
      department: recruiterDepartment,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter);

  // 2. Authenticate explicitly (redundant: join auto-auth's, but let's check login explicitly, including token switch)
  const recruiter2 = await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  typia.assert(recruiter2);
  TestValidator.equals(
    "hr recruiter id from join/login identical",
    recruiter2.id,
    recruiter.id,
  );

  // 3. Register several applicants (5+)
  const applicants: IAtsRecruitmentApplicant.IAuthorized[] = [];
  for (let i = 0; i < 7; ++i) {
    // Alternate name patterns for easy search, odd indices named 'Alpha', evens 'Beta'
    const applicantName = i % 2 === 0 ? `Alpha${i}` : `Beta${i}`;
    const applicantEmail = typia.random<string & tags.Format<"email">>();
    const applicantPassword = RandomGenerator.alphaNumeric(12);
    const applicantPhone =
      Math.random() < 0.7 ? RandomGenerator.mobile() : undefined;
    const joined = await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: applicantName,
        phone: applicantPhone,
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
    typia.assert(joined);
    applicants.push(joined);
  }

  // 4. Search by name substring (e.g., 'Alpha')
  const searchAlpha =
    await api.functional.atsRecruitment.hrRecruiter.applicants.index(
      connection,
      {
        body: {
          search: "Alpha",
          limit: 10,
        } satisfies IAtsRecruitmentApplicant.IRequest,
      },
    );
  typia.assert(searchAlpha);
  TestValidator.predicate(
    "searchAlpha applicants (name substring)",
    searchAlpha.data.every((x) => x.name.includes("Alpha")),
  );
  TestValidator.equals(
    "searchAlpha applicants match count",
    searchAlpha.data.length,
    applicants.filter((x) => x.name.includes("Alpha")).length,
  );
  // 5. Search by is_active (all active by default)
  const searchActive =
    await api.functional.atsRecruitment.hrRecruiter.applicants.index(
      connection,
      {
        body: {
          is_active: true,
        } satisfies IAtsRecruitmentApplicant.IRequest,
      },
    );
  typia.assert(searchActive);
  TestValidator.predicate(
    "searchActive: all returned are active",
    searchActive.data.every((x) => x.is_active),
  );

  // 6. Search with pagination (limit = 2)
  const pagedApplicants: IPageIAtsRecruitmentApplicant.ISummary[] = [];
  for (let page = 1; page <= 3; ++page) {
    const paged =
      await api.functional.atsRecruitment.hrRecruiter.applicants.index(
        connection,
        {
          body: {
            limit: 2,
            page: page satisfies number as number,
          } satisfies IAtsRecruitmentApplicant.IRequest,
        },
      );
    typia.assert(paged);
    TestValidator.equals(
      "page limit respected",
      paged.data.length,
      paged.data.length <= 2 ? paged.data.length : 2,
    );
    TestValidator.equals(
      `current page matches sent page`,
      paged.pagination.current,
      page,
    );
    pagedApplicants.push(paged);
  }
  // 7. Search for non-existent applicant
  const searchNonExistent =
    await api.functional.atsRecruitment.hrRecruiter.applicants.index(
      connection,
      {
        body: {
          search: "NonExistentFooBarZZZXQWERTY",
        } satisfies IAtsRecruitmentApplicant.IRequest,
      },
    );
  typia.assert(searchNonExistent);
  TestValidator.equals(
    "non-existent search yields zero records",
    searchNonExistent.data.length,
    0,
  );
  // 8. Search with excessive page number
  const excessivePage =
    await api.functional.atsRecruitment.hrRecruiter.applicants.index(
      connection,
      {
        body: {
          limit: 2,
          page: 99 satisfies number as number,
        } satisfies IAtsRecruitmentApplicant.IRequest,
      },
    );
  typia.assert(excessivePage);
  TestValidator.equals(
    "excessive page yields zero results",
    excessivePage.data.length,
    0,
  );
  // 9. All results only have summary properties (id, email, name, is_active)
  const checkSummary = searchAlpha.data
    .concat(searchActive.data)
    .concat(...pagedApplicants.flatMap((x) => x.data));
  for (const row of checkSummary) {
    TestValidator.predicate(
      "summary fields only for applicant result",
      typeof row.id === "string" &&
        typeof row.email === "string" &&
        typeof row.name === "string" &&
        typeof row.is_active === "boolean" &&
        Object.keys(row).every((key) =>
          ["id", "email", "name", "is_active"].includes(key),
        ),
    );
  }
}
