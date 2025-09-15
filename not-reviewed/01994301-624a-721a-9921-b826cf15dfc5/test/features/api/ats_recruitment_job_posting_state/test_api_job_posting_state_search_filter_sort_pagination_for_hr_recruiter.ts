import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobPostingState";

/**
 * Validates the HR recruiter's ability to search, filter, sort, and paginate
 * job posting states.
 *
 * 1. Register a new HR recruiter account
 * 2. Retrieve all job posting states (unfiltered, default pagination)
 * 3. Filter states by 'is_active' true and false
 * 4. Perform a text 'search' filter using the label/state_code/description
 * 5. Select a unique state_code from result and filter by it
 * 6. Test pagination - change limit, move to next page, try out-of-bounds page
 * 7. Test sorting by 'label' (asc/desc) and 'sort_order'
 * 8. Test that fields visible to HR recruiter do not leak sensitive/admin-only
 *    information
 * 9. Validate role enforcement: retrieving as HR recruiter is allowed, but
 *    malformed/invalid requests error
 * 10. Validate edge cases: empty result set, invalid filter format, missing params
 */
export async function test_api_job_posting_state_search_filter_sort_pagination_for_hr_recruiter(
  connection: api.IConnection,
) {
  // 1. Register a new HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: hrEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    department: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, { body: joinBody });
  typia.assert(recruiter);

  // 2. Retrieve job posting states (default request, page 0, limit default)
  const allStatesPage: IPageIAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.index(
      connection,
      { body: {} satisfies IAtsRecruitmentJobPostingState.IRequest },
    );
  typia.assert(allStatesPage);
  TestValidator.predicate(
    "has pagination info",
    typeof allStatesPage.pagination === "object",
  );
  TestValidator.predicate(
    "has job posting states array",
    Array.isArray(allStatesPage.data),
  );

  // If no states exist, short-circuit other validations
  if (!allStatesPage.data.length) {
    TestValidator.equals("empty result set", allStatesPage.data.length, 0);
    return;
  }

  // 3. Filter by is_active true/false
  for (const is_active of [true, false]) {
    const filteredStates: IPageIAtsRecruitmentJobPostingState =
      await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.index(
        connection,
        {
          body: { is_active } satisfies IAtsRecruitmentJobPostingState.IRequest,
        },
      );
    typia.assert(filteredStates);
    for (const state of filteredStates.data) {
      TestValidator.equals(
        `is_active is respected: ${is_active}`,
        state.is_active,
        is_active,
      );
    }
  }

  // 4. Text search: use a substring from a random state_code, label, or description
  const sampleState = RandomGenerator.pick(allStatesPage.data);
  let sampleText = sampleState.label;
  if (!sampleText && sampleState.state_code)
    sampleText = sampleState.state_code;
  if (!sampleText && sampleState.description)
    sampleText = sampleState.description ?? "";
  if (sampleText.length > 4) sampleText = sampleText.substring(0, 4);
  const searchPage: IPageIAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.index(
      connection,
      {
        body: {
          search: sampleText,
        } satisfies IAtsRecruitmentJobPostingState.IRequest,
      },
    );
  typia.assert(searchPage);
  for (const state of searchPage.data) {
    TestValidator.predicate(
      `search text matched in label/state_code/description: ${sampleText}`,
      state.label?.includes(sampleText) ||
        state.state_code?.includes(sampleText) ||
        (state.description ?? "").includes(sampleText),
    );
  }

  // 5. Single state_code filter
  const filteredByStateCode: IPageIAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.index(
      connection,
      {
        body: {
          state_codes: [sampleState.state_code],
        } satisfies IAtsRecruitmentJobPostingState.IRequest,
      },
    );
  typia.assert(filteredByStateCode);
  for (const state of filteredByStateCode.data) {
    TestValidator.equals(
      `filtered by unique state_code`,
      state.state_code,
      sampleState.state_code,
    );
  }

  // 6. Pagination - use limit/page
  const pageSize = 2;
  const firstPage =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.index(
      connection,
      {
        body: {
          limit: pageSize,
          page: 0,
        } satisfies IAtsRecruitmentJobPostingState.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination: first page",
    firstPage.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination: limit applied",
    firstPage.data.length,
    Math.min(pageSize, allStatesPage.pagination.records),
  );

  // If more than one page, fetch next page(s)
  if (allStatesPage.pagination.records > pageSize) {
    const secondPage =
      await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.index(
        connection,
        {
          body: {
            limit: pageSize,
            page: 1,
          } satisfies IAtsRecruitmentJobPostingState.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "pagination: second page",
      secondPage.pagination.current,
      1,
    );
  }
  // Out of bounds - use high page index
  const highPage =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.index(
      connection,
      {
        body: {
          page: 9999,
          limit: pageSize,
        } satisfies IAtsRecruitmentJobPostingState.IRequest,
      },
    );
  typia.assert(highPage);
  TestValidator.equals(
    "pagination: empty result for out of range",
    highPage.data.length,
    0,
  );

  // 7. Sorting (order_by label asc/desc, sort_order asc/desc)
  for (const [order_by, order_dir] of [
    ["label", "asc"],
    ["label", "desc"],
    ["sort_order", "asc"],
    ["sort_order", "desc"],
  ] as const) {
    const sortPage =
      await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.index(
        connection,
        {
          body: {
            order_by,
            order_dir,
            limit: pageSize,
          } satisfies IAtsRecruitmentJobPostingState.IRequest,
        },
      );
    typia.assert(sortPage);
    // Check that data is sorted accordingly (simple check)
    for (let i = 1; i < sortPage.data.length; ++i) {
      if (order_by === "label") {
        const prev = sortPage.data[i - 1].label;
        const curr = sortPage.data[i].label;
        if (order_dir === "asc")
          TestValidator.predicate(`label asc sort at ${i}`, prev <= curr);
        else TestValidator.predicate(`label desc sort at ${i}`, prev >= curr);
      } else if (order_by === "sort_order") {
        const prev = sortPage.data[i - 1].sort_order;
        const curr = sortPage.data[i].sort_order;
        if (order_dir === "asc")
          TestValidator.predicate(`sort_order asc at ${i}`, prev <= curr);
        else TestValidator.predicate(`sort_order desc at ${i}`, prev >= curr);
      }
    }
  }

  // 8. No sensitive fields exposed (should not leak admin/system fields)
  for (const state of allStatesPage.data) {
    // Should not expose password hashes or tokens etc (all allowed fields by DTO)
    const allowedFields = [
      "id",
      "state_code",
      "label",
      "description",
      "is_active",
      "sort_order",
      "created_at",
      "updated_at",
      "deleted_at",
    ];
    TestValidator.equals(
      "job posting state only has allowed fields",
      Object.keys(state).sort(),
      allowedFields.sort(),
    );
  }

  // 9. Invalid/malformed filter (should error at runtime, not type)
  await TestValidator.error(
    "invalid state_codes filter should error",
    async () => {
      // Provide logically invalid business filter - empty array for state_codes
      await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.index(
        connection,
        {
          body: {
            state_codes: [],
          } satisfies IAtsRecruitmentJobPostingState.IRequest,
        },
      );
    },
  );

  // 10. Missing/unsupported filters - should NOT throw (just returns all)
  const noFilterRes =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.index(
      connection,
      { body: {} satisfies IAtsRecruitmentJobPostingState.IRequest },
    );
  typia.assert(noFilterRes);
}
