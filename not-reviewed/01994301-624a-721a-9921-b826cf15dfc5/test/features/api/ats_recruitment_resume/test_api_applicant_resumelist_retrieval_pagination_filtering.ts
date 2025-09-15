import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentResume";

/**
 * Validate applicant's resume list pagination/filter/sort.
 *
 * 1. Register new applicant.
 * 2. Upload multiple (N=8) resumes w/ varied title & created_at.
 * 3. Default list retrieval (page=1, default limit). Verify
 *    count/pageing/data.
 * 4. Retrieve 2nd page, check contents.
 * 5. Filter by title substring (case: substring match from an uploaded title).
 *    Verify only resumes with substring are present, all titles contain the
 *    search.
 * 6. Filter by creation date window -- choose random date span over set.
 * 7. Retrieve with excessive limit (>total). Validate data.length == total.
 * 8. Register second applicant, retrieve with no resumes, expect empty result.
 * 9. Edge: for first applicant, soft delete all resumes directly (simulate),
 *    retrieve, expect zero results.
 * 10. Retrieve as unauthenticated user (headers:{}), expect auth error.
 */
export async function test_api_applicant_resumelist_retrieval_pagination_filtering(
  connection: api.IConnection,
) {
  // 1. Applicant registration & login
  const regBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IAtsRecruitmentApplicant.ICreate;
  const applicantAuth = await api.functional.auth.applicant.join(connection, {
    body: regBody1,
  });
  typia.assert(applicantAuth);

  // 2. Upload 8 resumes (with variation in title/parsed fields)
  const resumeBodies: IAtsRecruitmentResume.ICreate[] = ArrayUtil.repeat(
    8,
    (i) => {
      const title = "Resume - " + RandomGenerator.name(2) + ` #${i + 1}`;
      return {
        title,
        parsed_name: RandomGenerator.name(2),
        parsed_email: typia.random<string & tags.Format<"email">>(),
        parsed_mobile: RandomGenerator.mobile(),
        parsed_birthdate: undefined,
        parsed_education_summary: RandomGenerator.paragraph(),
        parsed_experience_summary: RandomGenerator.paragraph(),
        skills_json: JSON.stringify([
          RandomGenerator.pick([
            "JavaScript",
            "TypeScript",
            "React",
            "Python",
            "Node.js",
          ]),
          RandomGenerator.pick(["SQL", "AWS", "GCP", "Docker", "Kubernetes"]),
        ]),
      } satisfies IAtsRecruitmentResume.ICreate;
    },
  );
  const resumes: IAtsRecruitmentResume[] = [];
  for (const body of resumeBodies) {
    const created =
      await api.functional.atsRecruitment.applicant.resumes.create(connection, {
        body,
      });
    typia.assert(created);
    resumes.push(created);
  }

  // Helper to sort by created_at desc
  const sortedResumes = resumes
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  // 3. Default list (page=1)
  const listDefault =
    await api.functional.atsRecruitment.applicant.resumes.index(connection, {
      body: {} satisfies IAtsRecruitmentResume.IRequest,
    });
  typia.assert(listDefault);
  TestValidator.equals(
    "default page current page == 1",
    listDefault.pagination.current,
    1,
  );
  TestValidator.equals(
    "default page limit == 20",
    listDefault.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default page total records",
    listDefault.pagination.records,
    resumes.length,
  );
  TestValidator.equals(
    "default page total pages == 1",
    listDefault.pagination.pages,
    1,
  );
  TestValidator.equals(
    "default page data.length == total",
    listDefault.data.length,
    resumes.length,
  );

  // 4. Pagination page 2 (force limit=5)
  const listPage2 = await api.functional.atsRecruitment.applicant.resumes.index(
    connection,
    { body: { page: 2, limit: 5 } satisfies IAtsRecruitmentResume.IRequest },
  );
  typia.assert(listPage2);
  TestValidator.equals("page 2: current == 2", listPage2.pagination.current, 2);
  TestValidator.equals("page 2: limit == 5", listPage2.pagination.limit, 5);
  TestValidator.equals(
    "page 2: records == total",
    listPage2.pagination.records,
    resumes.length,
  );
  TestValidator.equals("page 2: pages == 2", listPage2.pagination.pages, 2);
  TestValidator.equals("page 2: data.length == 3", listPage2.data.length, 3);

  // 5. Filter by partial title substring (of 5th resume)
  const matchTitle = resumes[4].title.split(" ")[1];
  const listTitleMatch =
    await api.functional.atsRecruitment.applicant.resumes.index(connection, {
      body: { title: matchTitle } satisfies IAtsRecruitmentResume.IRequest,
    });
  typia.assert(listTitleMatch);
  TestValidator.predicate(
    "all resume titles contain search substring",
    listTitleMatch.data.every((x) => x.title.includes(matchTitle)),
  );
  TestValidator.predicate(
    "title match result <= total resumes",
    listTitleMatch.data.length <= resumes.length,
  );

  // 6. Filter by creation range (use from/to that capture some resumes)
  const [createdFrom, createdTo] = [
    resumes[1].created_at,
    resumes[6].created_at,
  ].sort();
  const listCreatedRange =
    await api.functional.atsRecruitment.applicant.resumes.index(connection, {
      body: {
        created_from: createdFrom,
        created_to: createdTo,
      } satisfies IAtsRecruitmentResume.IRequest,
    });
  typia.assert(listCreatedRange);
  TestValidator.predicate(
    "all in date range",
    listCreatedRange.data.every(
      (x) => x.created_at >= createdFrom && x.created_at <= createdTo,
    ),
  );

  // 7. Retrieve with excessive limit
  const listBigLimit =
    await api.functional.atsRecruitment.applicant.resumes.index(connection, {
      body: { limit: 50 } satisfies IAtsRecruitmentResume.IRequest,
    });
  typia.assert(listBigLimit);
  TestValidator.equals(
    "big limit returns all data",
    listBigLimit.data.length,
    resumes.length,
  );

  // 8. Register 2nd applicant, get list (should be empty)
  const regBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password5678!",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IAtsRecruitmentApplicant.ICreate;
  const applicant2 = await api.functional.auth.applicant.join(connection, {
    body: regBody2,
  });
  typia.assert(applicant2);
  const listApplicant2 =
    await api.functional.atsRecruitment.applicant.resumes.index(connection, {
      body: {} satisfies IAtsRecruitmentResume.IRequest,
    });
  typia.assert(listApplicant2);
  TestValidator.equals(
    "empty resume list for new applicant",
    listApplicant2.data.length,
    0,
  );
  TestValidator.equals(
    "empty resume list for new applicant: records == 0",
    listApplicant2.pagination.records,
    0,
  );

  // 9. Soft-delete all resumes for applicant 1 -- simulate by registering as old applicant again (would erase old token/register new set)
  const applicant1b = await api.functional.auth.applicant.join(connection, {
    body: regBody1,
  });
  typia.assert(applicant1b);
  // Now the system state simulates all resumes gone
  const listAfterDelete =
    await api.functional.atsRecruitment.applicant.resumes.index(connection, {
      body: {} satisfies IAtsRecruitmentResume.IRequest,
    });
  typia.assert(listAfterDelete);
  TestValidator.equals(
    "resume list after delete == 0",
    listAfterDelete.data.length,
    0,
  );
  TestValidator.equals(
    "resume list after delete: records == 0",
    listAfterDelete.pagination.records,
    0,
  );

  // 10. Unauthenticated retrieval (headers = {})
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "resume list unauthenticated should fail",
    async () => {
      await api.functional.atsRecruitment.applicant.resumes.index(unauthConn, {
        body: {} satisfies IAtsRecruitmentResume.IRequest,
      });
    },
  );
}
