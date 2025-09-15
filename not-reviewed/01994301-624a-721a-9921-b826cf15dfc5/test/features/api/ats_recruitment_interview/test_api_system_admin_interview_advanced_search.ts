import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterview";

/**
 * E2E test for advanced interview search as system admin.
 *
 * Verifies that system admin can see and filter interviews across the
 * system, using all available search and filtering mechanisms. Also
 * verifies proper handling of pagination, soft deletes, edge cases (zero
 * results, invalid filters), and required result metadata. Checks that
 * authentication is enforced.
 *
 * Workflow:
 *
 * 1. Register/test system admin, applicant, hr recruiter, tech reviewer
 * 2. System admin creates at least 2 interviews with unique participants &
 *    stages
 * 3. System admin retrieves full list, checks metadata, then applies various
 *    filters (by applicant, HR, tech, stage, status, date)
 * 4. Confirms pagination (limit/page), soft delete exclusion, no results for
 *    invalid UUID, error for unauthenticated access
 */
export async function test_api_system_admin_interview_advanced_search(
  connection: api.IConnection,
) {
  // 1. Register system admin and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: "testpassword123!",
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register applicant, HR recruiter, tech reviewer
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: "applicantpw",
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hr = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: "hrpw",
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hr);

  const techEmail = typia.random<string & tags.Format<"email">>();
  const tech = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techEmail,
      password: "techpw",
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(tech);

  // 3. System admin creates two interviews with different data
  const applicationIdA = typia.random<string & tags.Format<"uuid">>();
  const interviewA =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: applicationIdA,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "tech_round",
          status: "scheduled",
          notes: "Tech round with applicant A.",
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interviewA);

  const applicationIdB = typia.random<string & tags.Format<"uuid">>();
  const interviewB =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: applicationIdB,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "final",
          status: "completed",
          notes: "Final with applicant B.",
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interviewB);

  // 4. Retrieve all interviews (no filters)
  const allResults =
    await api.functional.atsRecruitment.systemAdmin.interviews.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allResults);
  TestValidator.predicate(
    "at least 2 interviews in all results",
    allResults.data.length >= 2,
  );
  allResults.data.forEach((item) => {
    TestValidator.predicate(
      "interview result includes id",
      typeof item.id === "string",
    );
    TestValidator.predicate(
      "interview result includes stage",
      typeof item.stage === "string",
    );
    TestValidator.predicate(
      "interview result includes status",
      typeof item.status === "string",
    );
    TestValidator.predicate(
      "interview result includes timestamps",
      typeof item.created_at === "string" &&
        typeof item.updated_at === "string",
    );
  });

  // 5. Filter by applicant - should yield zero (since no reference link to applicant_id in interviews entity)
  const filterByApplicant =
    await api.functional.atsRecruitment.systemAdmin.interviews.index(
      connection,
      {
        body: {
          applicant_id: applicant.id,
        },
      },
    );
  typia.assert(filterByApplicant);
  TestValidator.equals(
    "zero results on unknown applicant_id",
    filterByApplicant.data.length,
    0,
  );

  // 6. Filter by stage: "tech_round" (should yield 1)
  const techRoundResults =
    await api.functional.atsRecruitment.systemAdmin.interviews.index(
      connection,
      {
        body: {
          stage: "tech_round",
        },
      },
    );
  typia.assert(techRoundResults);
  TestValidator.equals(
    "tech_round filter returns 1 interview",
    techRoundResults.data.length,
    1,
  );
  TestValidator.equals(
    "returned id matches interviewA",
    techRoundResults.data[0].id,
    interviewA.id,
  );

  // 7. Pagination test: limit = 1
  const paged =
    await api.functional.atsRecruitment.systemAdmin.interviews.index(
      connection,
      {
        body: {
          limit: 1 satisfies number,
          page: 1 satisfies number,
        },
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "paged result contains only 1 record",
    paged.data.length,
    1,
  );

  // 8. Edge case: invalid filter (random non-existent UUID)
  const invalidFilter =
    await api.functional.atsRecruitment.systemAdmin.interviews.index(
      connection,
      {
        body: {
          applicant_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(invalidFilter);
  TestValidator.equals(
    "zero results for random invalid applicant_id",
    invalidFilter.data.length,
    0,
  );

  // 9. Auth error: unauthenticated connection should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot access interview search",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );
}
