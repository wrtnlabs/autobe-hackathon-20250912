import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicant";

/**
 * Validate system admin searching applicant accounts with filters/pagination.
 *
 * End-to-end workflow:
 *
 * 1. Register system admin and authenticate
 * 2. Register diverse applicant accounts for search
 * 3. Search by name
 * 4. Search by active status
 * 5. Generic text search (partial match)
 * 6. Test pagination
 * 7. Search with no-matching filter
 * 8. Pagination out of bounds (page>total)
 * 9. Search with all filter fields unset Validate: only allowed fields visible,
 *    correct paging meta, empty for failure, no crash.
 */
export async function test_api_applicant_search_with_various_filters_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminName: string = RandomGenerator.name();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Login as system admin
  const adminLogin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IAtsRecruitmentSystemAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Register multiple applicant accounts (6 for diversity)
  const applicants: IAtsRecruitmentApplicant.IAuthorized[] =
    await ArrayUtil.asyncRepeat(
      6,
      async (i) =>
        await api.functional.auth.applicant.join(connection, {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(12),
            name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
          } satisfies IAtsRecruitmentApplicant.ICreate,
        }),
    );
  applicants.forEach((app) => typia.assert(app));

  // 4. Search applicants by exact name of one applicant
  const nameToSearch = applicants[0].name;
  const searchByNameResult =
    await api.functional.atsRecruitment.systemAdmin.applicants.index(
      connection,
      {
        body: {
          search: nameToSearch,
        } satisfies IAtsRecruitmentApplicant.IRequest,
      },
    );
  typia.assert(searchByNameResult);
  TestValidator.predicate(
    "search by exact name should return at least one result",
    searchByNameResult.data.some((a) => a.name === nameToSearch),
  );

  // 5. Search applicants by is_active status
  const searchByActive =
    await api.functional.atsRecruitment.systemAdmin.applicants.index(
      connection,
      {
        body: {
          is_active: true,
        } satisfies IAtsRecruitmentApplicant.IRequest,
      },
    );
  typia.assert(searchByActive);
  TestValidator.predicate(
    "all returned applicants should be active",
    searchByActive.data.every((a) => a.is_active),
  );

  // 6. Search by partial email (substring of applicant's email)
  const emailPart = applicants[1].email.split("@")[0].slice(0, 5);
  const searchByEmailPartial =
    await api.functional.atsRecruitment.systemAdmin.applicants.index(
      connection,
      {
        body: {
          search: emailPart,
        } satisfies IAtsRecruitmentApplicant.IRequest,
      },
    );
  typia.assert(searchByEmailPartial);
  TestValidator.predicate(
    "search by partial email should contain the applicant",
    searchByEmailPartial.data.some((a) => a.email === applicants[1].email),
  );

  // 7. Pagination: page 1, limit 2
  const pagination1 =
    await api.functional.atsRecruitment.systemAdmin.applicants.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IAtsRecruitmentApplicant.IRequest,
      },
    );
  typia.assert(pagination1);
  TestValidator.equals(
    "pagination: limit respected",
    pagination1.data.length,
    2,
  );
  TestValidator.equals(
    "pagination: correct meta current",
    pagination1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: correct meta limit",
    pagination1.pagination.limit,
    2,
  );

  // 8. Edge Case - No match filter
  const searchNoMatch =
    await api.functional.atsRecruitment.systemAdmin.applicants.index(
      connection,
      {
        body: {
          search: "NONEXISTENT_SURGABBBLENAME_NONMATCH_TEST_STRING",
        } satisfies IAtsRecruitmentApplicant.IRequest,
      },
    );
  typia.assert(searchNoMatch);
  TestValidator.equals(
    "search with no-match should return empty",
    searchNoMatch.data.length,
    0,
  );

  // 9. Edge Case - Pagination way out of bounds
  const farPage = 9999;
  const paginationOut =
    await api.functional.atsRecruitment.systemAdmin.applicants.index(
      connection,
      {
        body: {
          page: farPage,
          limit: 3,
        } satisfies IAtsRecruitmentApplicant.IRequest,
      },
    );
  typia.assert(paginationOut);
  TestValidator.equals(
    "pagination out of bounds returns empty",
    paginationOut.data.length,
    0,
  );

  // 10. All filter fields unset/undefined
  const allUnset =
    await api.functional.atsRecruitment.systemAdmin.applicants.index(
      connection,
      {
        body: {} satisfies IAtsRecruitmentApplicant.IRequest,
      },
    );
  typia.assert(allUnset);
  TestValidator.predicate(
    "default search must return at least one applicant",
    allUnset.data.length > 0,
  );

  // 11. Only allowed/summary fields are present (no leaked data)
  if (allUnset.data.length > 0) {
    allUnset.data.forEach((app) => {
      const keys = Object.keys(app).sort();
      const allowed = ["id", "email", "name", "is_active"].sort();
      TestValidator.equals(
        "no extra fields in applicant summary",
        keys,
        allowed,
      );
    });
  }
}
