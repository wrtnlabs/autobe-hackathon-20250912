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
 * Validate system admin ability to search/filter HR recruiter records.
 *
 * 1. Create a system admin
 * 2. Login as admin
 * 3. Register multiple HR recruiters with distinct names, emails, depts, activity
 * 4. As admin, search without filters and confirm all appear
 * 5. Filter by recruiter name and check correct record
 * 6. Filter by email
 * 7. Filter by department
 * 8. Filter by is_active
 * 9. Check pagination (limit/page)
 * 10. Validate only allowed fields are present (no password/token, etc)
 */
export async function test_api_system_admin_search_hr_recruiters(
  connection: api.IConnection,
) {
  // 1. Register new system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
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
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  }); // Updates connection headers

  // 3. Register multiple HR recruiters
  const recruiters = await ArrayUtil.asyncRepeat(3, async (idx) => {
    const name = "Recruiter " + RandomGenerator.name(1) + idx;
    const department = idx === 2 ? undefined : `Dept${idx}`;
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(12);
    const joinResult = await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email,
        password,
        name,
        department,
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
    typia.assert(joinResult);
    return {
      ...joinResult,
      plain: { email, password, name, department },
    };
  });
  // All recruiters created as is_active

  // 4. As admin, search without filter
  const allResult =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
      connection,
      {
        body: {} satisfies IAtsRecruitmentHrRecruiter.IRequest,
      },
    );
  typia.assert(allResult);
  // Confirm that all the recruiters' emails exist in the results
  for (const recruiter of recruiters) {
    TestValidator.predicate(
      `can find recruiter ${recruiter.email} in full search result`,
      allResult.data.some((rec) => rec.email === recruiter.email),
    );
  }

  // 5. Filter by recruiter name
  const filterName = recruiters[0].plain.name;
  const nameResult =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
      connection,
      {
        body: {
          search: filterName,
        } satisfies IAtsRecruitmentHrRecruiter.IRequest,
      },
    );
  typia.assert(nameResult);
  TestValidator.predicate(
    "search by name returns correct recruiter",
    nameResult.data.some((rec) => rec.name === filterName),
  );

  // 6. Filter by email (should match only one)
  const filterEmail = recruiters[1].plain.email;
  const emailResult =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
      connection,
      {
        body: {
          search: filterEmail,
        } satisfies IAtsRecruitmentHrRecruiter.IRequest,
      },
    );
  typia.assert(emailResult);
  TestValidator.equals(
    "search by email yields one recruiter",
    emailResult.data.length,
    1,
  );
  TestValidator.equals(
    "email matches recruiter",
    emailResult.data[0].email,
    filterEmail,
  );

  // 7. Filter by department (should match at least some recruiter)
  const filterDept = recruiters[0].plain.department;
  if (filterDept) {
    const deptResult =
      await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
        connection,
        {
          body: {
            department: filterDept,
          } satisfies IAtsRecruitmentHrRecruiter.IRequest,
        },
      );
    typia.assert(deptResult);
    TestValidator.predicate(
      "department filter returns recruiters",
      deptResult.data.length > 0,
    );
    TestValidator.predicate(
      "all results are from correct department",
      deptResult.data.every((recruiter) => recruiter.department === filterDept),
    );
  }

  // 8. Filter by is_active (all should be active)
  const activeResult =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
      connection,
      {
        body: {
          is_active: true,
        } satisfies IAtsRecruitmentHrRecruiter.IRequest,
      },
    );
  typia.assert(activeResult);
  TestValidator.predicate(
    "all recruiters in active search are active",
    activeResult.data.every((rec) => rec.is_active === true),
  );

  // 9. Pagination (limit=1, test page=1,2)
  const paged1 =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
      connection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IAtsRecruitmentHrRecruiter.IRequest,
      },
    );
  typia.assert(paged1);
  TestValidator.equals(
    "pagination limit 1 returns one record",
    paged1.data.length,
    1,
  );
  const paged2 =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
      connection,
      {
        body: {
          limit: 1,
          page: 2,
        } satisfies IAtsRecruitmentHrRecruiter.IRequest,
      },
    );
  typia.assert(paged2);
  TestValidator.equals(
    "pagination page 2 returns one record",
    paged2.data.length,
    1,
  );

  // 10. Validate fields: check allowed summary fields, no sensitive info
  // For the first recruiter in result
  const sampleSummary = allResult.data[0];
  // Only permitted keys:
  const allowed = [
    "id",
    "email",
    "name",
    "department",
    "is_active",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  for (const key of Object.keys(sampleSummary)) {
    TestValidator.predicate(
      `no unexpected field in summary: ${key}`,
      allowed.includes(key),
    );
  }
}
