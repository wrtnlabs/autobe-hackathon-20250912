import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContentcreatorinstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentcreatorinstructor";

export async function test_api_content_creator_instructor_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Org Admin joins (authentication)
  const tenant_id = typia.random<string & tags.Format<"uuid">>();
  const adminPayload = {
    tenant_id,
    email: `admin.${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "password123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const admin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminPayload,
    });
  typia.assert(admin);
  TestValidator.equals("Admin tenant id matches", admin.tenant_id, tenant_id);

  // 2. Define helper to query list with filters
  async function queryList(
    body: IEnterpriseLmsContentCreatorInstructor.IRequest,
  ): Promise<IPageIEnterpriseLmsContentcreatorinstructor.ISummary> {
    const res =
      await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.index(
        connection,
        { body },
      );
    typia.assert(res);
    // Assert tenant scope: since each user summary does not include tenant_id, we cannot check directly in item but tenant matches implicitly for authorization
    for (const user of res.data) {
      TestValidator.predicate(
        "User id is UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          user.id,
        ),
      );
      TestValidator.predicate(
        "User email contains @",
        user.email.includes("@"),
      );
      TestValidator.predicate(
        "User status is non-empty string",
        typeof user.status === "string" && user.status.length > 0,
      );
    }
    return res;
  }

  // 3. Basic unfiltered request (default pagination)
  const defaultList = await queryList({});
  TestValidator.predicate(
    "Default list data length reasonable",
    defaultList.data.length >= 0,
  );
  TestValidator.predicate(
    "Default pagination current page 0 or 1",
    defaultList.pagination.current === 0 ||
      defaultList.pagination.current === 1,
  );
  TestValidator.predicate(
    "Pagination limit is positive",
    defaultList.pagination.limit > 0,
  );

  // 4. Pagination test: set page and limit
  const pagedList = await queryList({ page: 1, limit: 5 });
  TestValidator.equals(
    "Pagination current page is 1",
    pagedList.pagination.current,
    1,
  );
  TestValidator.equals("Pagination limit is 5", pagedList.pagination.limit, 5);
  TestValidator.predicate("Data length <= limit", pagedList.data.length <= 5);

  // 5. Filter by email substring
  if (defaultList.data.length > 0) {
    const sampleUser = RandomGenerator.pick(defaultList.data);
    const emailSample =
      sampleUser.email.length >= 3
        ? sampleUser.email.substring(0, 3)
        : sampleUser.email;
    const filteredByEmail = await queryList({ search: emailSample });

    TestValidator.predicate(
      "All filtered emails contain search substring",
      filteredByEmail.data.every((u) => u.email.includes(emailSample)),
    );
  }

  // 6. Filter by status (only first if any)
  if (defaultList.data.length > 0) {
    const sampleStatus = RandomGenerator.pick(defaultList.data).status;
    const filteredByStatus = await queryList({ status: sampleStatus });
    TestValidator.predicate(
      "All filtered users have requested status",
      filteredByStatus.data.every((u) => u.status === sampleStatus),
    );
  }

  // 7. Empty result test: expect empty when impossible filter
  const emptyResult = await queryList({
    search: "nonexistentemail@example.com",
  });
  TestValidator.equals("Empty result data length", emptyResult.data.length, 0);
  TestValidator.predicate(
    "Empty result pages >= 0",
    emptyResult.pagination.pages >= 0,
  );

  // 8. Excessive limit test: limit > 1000 triggers max cap or works safely
  const bigLimit = await queryList({ limit: 1500 });
  TestValidator.predicate(
    "Limit capped or respected",
    bigLimit.pagination.limit <= 1500,
  );
  TestValidator.predicate(
    "Data length <= limit",
    bigLimit.data.length <= bigLimit.pagination.limit,
  );
}
