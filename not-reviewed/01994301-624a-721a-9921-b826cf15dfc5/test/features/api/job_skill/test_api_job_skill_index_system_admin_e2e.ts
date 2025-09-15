import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobSkill";

export async function test_api_job_skill_index_system_admin_e2e(
  connection: api.IConnection,
) {
  /**
   * E2E test validating the system-admin job skill index/search endpoint:
   *
   * - Joins as system admin, creates 6 skills (variety of active/inactive, unique
   *   names)
   * - Index: basic all skills
   * - Search: substring, partial
   * - Filter: active/inactive only
   * - Pagination (page/limit)
   * - Sorting (asc/desc by name)
   * - Empty result (nonexistent name)
   * - Error handling for invalid page/limit
   * - Forbids access to unauthenticated users
   */
  // 1. Register a system admin and save admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register job skills (6, mix active/inactive, varying names)
  const skills = ArrayUtil.repeat(
    6,
    (i) =>
      ({
        name: `Skill_${RandomGenerator.alphabets(6)}_${i}`,
        description:
          i % 2 === 0 ? RandomGenerator.paragraph({ sentences: 2 }) : undefined,
        is_active: i % 3 !== 0, // 0, 3 inactive, rest active
      }) satisfies IAtsRecruitmentJobSkill.ICreate,
  );
  const createdSkills: IAtsRecruitmentJobSkill[] = [];
  for (const skill of skills) {
    const created =
      await api.functional.atsRecruitment.systemAdmin.jobSkills.create(
        connection,
        {
          body: skill,
        },
      );
    typia.assert(created);
    createdSkills.push(created);
  }

  // 3. Basic: index all (no filters)
  const allPage =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allPage);
  TestValidator.predicate("at least 6 skills listed", allPage.data.length >= 6);

  // 4. Search by name (subset, case-insensitive partial)
  const oneSkill = createdSkills[2];
  const partialName = oneSkill.name.slice(2, 7);
  const nameSearchPage =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.index(
      connection,
      {
        body: { name: partialName },
      },
    );
  typia.assert(nameSearchPage);
  TestValidator.predicate(
    "skills with name match returned",
    nameSearchPage.data.some((s) => s.name.includes(partialName)),
  );

  // 5. Filter by active/inactive
  const activePage =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.index(
      connection,
      {
        body: { is_active: true },
      },
    );
  typia.assert(activePage);
  TestValidator.predicate(
    "all active skills",
    activePage.data.every((s) => s.is_active === true),
  );

  const inactivePage =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.index(
      connection,
      {
        body: { is_active: false },
      },
    );
  typia.assert(inactivePage);
  TestValidator.predicate(
    "all inactive skills",
    inactivePage.data.every((s) => s.is_active === false),
  );

  // 6. Pagination: page 1 (limit 2), page 2 (limit 2)
  const page1 = await api.functional.atsRecruitment.systemAdmin.jobSkills.index(
    connection,
    {
      body: { page: 1, limit: 2 },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 limit", page1.data.length, 2);
  const page2 = await api.functional.atsRecruitment.systemAdmin.jobSkills.index(
    connection,
    {
      body: { page: 2, limit: 2 },
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 limit", page2.data.length, 2);

  // 7. Sort by name asc/desc
  const ascPage =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.index(
      connection,
      {
        body: { sort_by: "name", sort_dir: "asc" },
      },
    );
  typia.assert(ascPage);
  const ascNames = ascPage.data.map((s) => s.name);
  const sortedAsc = [...ascNames].sort();
  TestValidator.equals("sorted asc", ascNames, sortedAsc);

  const descPage =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.index(
      connection,
      {
        body: { sort_by: "name", sort_dir: "desc" },
      },
    );
  typia.assert(descPage);
  const descNames = descPage.data.map((s) => s.name);
  const sortedDesc = [...descNames].sort().reverse();
  TestValidator.equals("sorted desc", descNames, sortedDesc);

  // 8. Empty result: search with non-existent name
  const emptyPage =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.index(
      connection,
      {
        body: { name: "NON-EXISTENT-SKILL" },
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "no skills match non-existent name",
    emptyPage.data.length,
    0,
  );

  // 9. Error case: invalid page/limit (zero/negative)
  await TestValidator.error("index with page=0 fails", async () => {
    await api.functional.atsRecruitment.systemAdmin.jobSkills.index(
      connection,
      {
        body: { page: 0, limit: 2 },
      },
    );
  });
  await TestValidator.error("index with negative limit fails", async () => {
    await api.functional.atsRecruitment.systemAdmin.jobSkills.index(
      connection,
      {
        body: { page: 1, limit: -5 },
      },
    );
  });

  // 10. Unauthenticated access (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated index forbidden", async () => {
    await api.functional.atsRecruitment.systemAdmin.jobSkills.index(
      unauthConn,
      {
        body: {},
      },
    );
  });
}
