import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRecordAmendment";

/**
 * Validate searching and paginating patient record amendments as department
 * head user.
 *
 * 1. Register (join) a department head, then log in.
 * 2. (Assume) There exists at least one patient record the department head may
 *    access. Use a random uuid for patientRecordId, and try with at least one
 *    realistic value (and one clearly out-of-scope/deleted/invalid).
 * 3. Call the PATCH endpoint with paged/filtering criteria for recordAmendments;
 *    generate a request with amendment_type, approval_status,
 *    reviewed_by_user_id, date range, paging, sort order.
 * 4. Validate the response contains the expected
 *    IPageIHealthcarePlatformRecordAmendment structure, correct page/paging
 *    meta, filter reflection, and that amendment items all match
 *    patientRecordId and filter criteria.
 * 5. Call with an invalid patientRecordId (random/new/unknown); assert API returns
 *    a business error by catching and validating error is thrown (do not test
 *    type errors).
 * 6. Call with a deliberately invalid reviewed_by_user_id or filter reference;
 *    confirm explicit validation/business error response.
 */
export async function test_api_department_head_search_patient_record_amendments_with_paging_and_filter(
  connection: api.IConnection,
) {
  // 1. Register and login as department head
  const joinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    sso_provider: null,
    sso_provider_key: null,
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const departmentHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: joinReq,
    },
  );
  typia.assert(departmentHead);
  // Login (if needed, but join sets token):
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: joinReq.email,
      password: joinReq.password,
    },
  });

  // 2. Prepare a random patient record id (simulate context)
  const patientRecordId = typia.random<string & tags.Format<"uuid">>();

  // 3. Search with filters/pagination (happy path)
  const filterReq = {
    amendment_type: "correction",
    approval_status: "pending",
    page: 0,
    limit: 10,
    sort: "created_at",
    order: "desc",
  } satisfies IHealthcarePlatformRecordAmendment.IRequest;
  const pageAmendments =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.index(
      connection,
      {
        patientRecordId,
        body: filterReq,
      },
    );
  typia.assert(pageAmendments);
  // Response meta, filter, and type checks
  TestValidator.equals(
    "pagination limit matches",
    pageAmendments.pagination.limit,
    10,
  );
  if (pageAmendments.data.length > 0) {
    TestValidator.predicate(
      "each record matches patientRecordId",
      pageAmendments.data.every((x) => x.patient_record_id === patientRecordId),
    );
    TestValidator.predicate(
      "each record amendment_type matches filter",
      pageAmendments.data.every(
        (x) => x.amendment_type === filterReq.amendment_type,
      ),
    );
    TestValidator.predicate(
      "each record approval_status matches filter",
      pageAmendments.data.every(
        (x) => x.approval_status === filterReq.approval_status,
      ),
    );
  }

  // 4. Error case: invalid patientRecordId (simulate forbidden or not found)
  await TestValidator.error(
    "invalid or external patientRecordId returns error",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.index(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          body: filterReq,
        },
      );
    },
  );

  // 5. Error case: invalid reviewed_by_user_id
  await TestValidator.error(
    "invalid reviewed_by_user_id triggers error",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.index(
        connection,
        {
          patientRecordId,
          body: {
            ...filterReq,
            reviewed_by_user_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}
