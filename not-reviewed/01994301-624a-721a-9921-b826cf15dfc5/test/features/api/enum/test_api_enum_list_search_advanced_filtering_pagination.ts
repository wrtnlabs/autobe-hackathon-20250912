import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentEnum";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentEnum";

/**
 * Validate the admin enum code search, filter, and pagination functionality in
 * ATS.
 *
 * Workflow:
 *
 * 1. Register a system admin
 * 2. Login as that admin
 * 3. Search enums using various advanced filters, sort options, and pagination
 * 4. Validate result completeness, correctness, and order
 * 5. Check edge cases (empty result, boundary pages, combined filters)
 * 6. Confirm endpoint restricts unauthorized and unauthenticated access
 */
export async function test_api_enum_list_search_advanced_filtering_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const super_admin = true;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      password,
      name,
      super_admin,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Login as system admin (should not be needed, but to test token flow)
  const loggedIn = await api.functional.auth.systemAdmin.login(connection, {
    body: { email, password } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals("admin id matches after login", loggedIn.id, admin.id);

  // 3. Retrieve unfiltered full enum list (defaults)
  const fullResult =
    await api.functional.atsRecruitment.systemAdmin.enums.index(connection, {
      body: {} satisfies IAtsRecruitmentEnum.IRequest,
    });
  typia.assert(fullResult);
  TestValidator.predicate("data is array", Array.isArray(fullResult.data));
  // All enums should have correct summary fields
  fullResult.data.forEach((e) => typia.assert<IAtsRecruitmentEnum.ISummary>(e));
  // IDs should be unique
  TestValidator.equals(
    "enum ids unique",
    new Set(fullResult.data.map((e) => e.id)).size,
    fullResult.data.length,
  );

  // 4. Test basic pagination: limit/page
  const sampleLimit = 3;
  const page1 = await api.functional.atsRecruitment.systemAdmin.enums.index(
    connection,
    {
      body: {
        limit: sampleLimit,
        page: 1,
      } satisfies IAtsRecruitmentEnum.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "limit respected on first page",
    page1.data.length <= sampleLimit,
    true,
  );

  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.atsRecruitment.systemAdmin.enums.index(
      connection,
      {
        body: {
          limit: sampleLimit,
          page: 2,
        } satisfies IAtsRecruitmentEnum.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "limit respected on second page",
      page2.data.length <= sampleLimit,
      true,
    );
    // first page and second page should not overlap IDs
    const page1Ids = page1.data.map((e) => e.id);
    const page2Ids = page2.data.map((e) => e.id);
    TestValidator.equals(
      "page1 and page2 id overlap is none",
      page1Ids.some((id) => page2Ids.includes(id)),
      false,
    );
  }

  // 5. Filtering by enum_type (if possible)
  if (fullResult.data.length) {
    const picked = RandomGenerator.pick(fullResult.data);
    const filteredByType =
      await api.functional.atsRecruitment.systemAdmin.enums.index(connection, {
        body: {
          enum_type: picked.enum_type,
        } satisfies IAtsRecruitmentEnum.IRequest,
      });
    typia.assert(filteredByType);
    filteredByType.data.forEach((e) =>
      TestValidator.equals(
        "filter enum_type matches",
        e.enum_type,
        picked.enum_type,
      ),
    );
  }

  // 6. Filtering by enum_code
  if (fullResult.data.length) {
    const picked = RandomGenerator.pick(fullResult.data);
    const filteredByCode =
      await api.functional.atsRecruitment.systemAdmin.enums.index(connection, {
        body: {
          enum_code: picked.enum_code,
        } satisfies IAtsRecruitmentEnum.IRequest,
      });
    typia.assert(filteredByCode);
    filteredByCode.data.forEach((e) =>
      TestValidator.equals(
        "filter enum_code matches",
        e.enum_code,
        picked.enum_code,
      ),
    );
  }

  // 7. Partial string (label/search)
  if (fullResult.data.length) {
    const picked = RandomGenerator.pick(fullResult.data);
    if (picked.label.length > 2) {
      const substring = picked.label.substring(1, picked.label.length - 1);
      const filteredByLabel =
        await api.functional.atsRecruitment.systemAdmin.enums.index(
          connection,
          {
            body: { label: substring } satisfies IAtsRecruitmentEnum.IRequest,
          },
        );
      typia.assert(filteredByLabel);
      filteredByLabel.data.forEach((e) =>
        TestValidator.predicate(
          "label contains substring",
          e.label.includes(substring),
        ),
      );
    }
    // advanced search field
    if (picked.label.length > 3) {
      const mid = Math.floor(picked.label.length / 2);
      const sub = picked.label.slice(1, mid + 1);
      const filteredBySearch =
        await api.functional.atsRecruitment.systemAdmin.enums.index(
          connection,
          {
            body: { search: sub } satisfies IAtsRecruitmentEnum.IRequest,
          },
        );
      typia.assert(filteredBySearch);
      filteredBySearch.data.forEach((e) =>
        TestValidator.predicate(
          "label/code/description contains substring",
          [e.label, e.enum_code, e.description ?? ""].some((s) =>
            s.includes(sub),
          ),
        ),
      );
    }
  }

  // 8. Combined filters - enum_type and code
  if (fullResult.data.length) {
    const picked = RandomGenerator.pick(fullResult.data);
    const filtered =
      await api.functional.atsRecruitment.systemAdmin.enums.index(connection, {
        body: {
          enum_type: picked.enum_type,
          enum_code: picked.enum_code,
        } satisfies IAtsRecruitmentEnum.IRequest,
      });
    typia.assert(filtered);
    filtered.data.forEach((e) => {
      TestValidator.equals("combo enum_type", e.enum_type, picked.enum_type);
      TestValidator.equals("combo enum_code", e.enum_code, picked.enum_code);
    });
  }

  // 9. Sorting test (label asc/desc)
  if (fullResult.data.length > 2) {
    // sort asc
    const ascResult =
      await api.functional.atsRecruitment.systemAdmin.enums.index(connection, {
        body: {
          sortBy: "label",
          sortOrder: "asc",
          limit: fullResult.data.length,
        } satisfies IAtsRecruitmentEnum.IRequest,
      });
    typia.assert(ascResult);
    for (let i = 1; i < ascResult.data.length; ++i) {
      TestValidator.predicate(
        "asc label order",
        ascResult.data[i].label >= ascResult.data[i - 1].label,
      );
    }
    // sort desc
    const descResult =
      await api.functional.atsRecruitment.systemAdmin.enums.index(connection, {
        body: {
          sortBy: "label",
          sortOrder: "desc",
          limit: fullResult.data.length,
        } satisfies IAtsRecruitmentEnum.IRequest,
      });
    typia.assert(descResult);
    for (let i = 1; i < descResult.data.length; ++i) {
      TestValidator.predicate(
        "desc label order",
        descResult.data[i].label <= descResult.data[i - 1].label,
      );
    }
  }

  // 10. Pagination boundary: request past last page
  if (fullResult.pagination.pages > 0) {
    const pagePastLast =
      await api.functional.atsRecruitment.systemAdmin.enums.index(connection, {
        body: {
          page: fullResult.pagination.pages + 1,
          limit: 5,
        } satisfies IAtsRecruitmentEnum.IRequest,
      });
    typia.assert(pagePastLast);
    TestValidator.equals(
      "empty data past last page",
      pagePastLast.data.length,
      0,
    );
  }

  // 11. Error test: invalid request (negative page)
  await TestValidator.error("invalid negative page error", async () => {
    await api.functional.atsRecruitment.systemAdmin.enums.index(connection, {
      body: { page: -1 } satisfies IAtsRecruitmentEnum.IRequest,
    });
  });
  // 12. Unauthorized: unauthenticated request must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access blocked", async () => {
    await api.functional.atsRecruitment.systemAdmin.enums.index(unauthConn, {
      body: {} satisfies IAtsRecruitmentEnum.IRequest,
    });
  });
}
