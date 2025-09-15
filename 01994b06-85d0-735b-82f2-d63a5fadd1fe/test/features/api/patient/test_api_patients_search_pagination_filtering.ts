import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPatient";

/**
 * Advanced search, filter, and pagination for organization admin patients
 * index.
 *
 * 1. Authenticate as new org admin
 * 2. Create diverse set of patients with unique names/birthdates/emails
 * 3. Basic pagination test
 * 4. Patient name substring filter
 * 5. Birthdate range filter
 * 6. Registration date (created_at) range filter
 * 7. Impossible filter (should return zero results)
 * 8. Permission test: search without login (should fail)
 * 9. Use typia.assert for result shape, TestValidator for pagination/data filter
 *    logic
 */
export async function test_api_patients_search_pagination_filtering(
  connection: api.IConnection,
) {
  // 1. Authenticate new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        password: RandomGenerator.alphaNumeric(12),
      },
    });
  typia.assert(admin);

  // 2. Create 7 patients
  const baseBirth = new Date("1990-01-01T00:00:00Z").getTime();
  const birthInterval = 666666666; // Unique interval, ensures spacing
  const patients = await ArrayUtil.asyncRepeat(7, async (i) => {
    // names: ensure distinct, but first 3 share the same 2 prefix letters for partial search
    const fullName =
      i < 3
        ? "Samson".slice(0, 2) + RandomGenerator.name(2) // names with "Sa" prefix
        : RandomGenerator.name(3);
    // spaced-out birthdate per patient
    const dob = new Date(baseBirth + i * birthInterval).toISOString();
    const email = RandomGenerator.alphabets(8) + i + "@test.com";
    const phone = RandomGenerator.mobile();
    const body = {
      email: email as string & tags.Format<"email">,
      full_name: fullName,
      date_of_birth: dob,
      phone,
    } satisfies IHealthcarePlatformPatient.ICreate;
    const created =
      await api.functional.healthcarePlatform.organizationAdmin.patients.create(
        connection,
        { body },
      );
    typia.assert(created);
    return created;
  });

  // 3. Basic pagination, page 1 limit 3
  const page1 =
    await api.functional.healthcarePlatform.organizationAdmin.patients.index(
      connection,
      {
        body: {
          page: 1 satisfies number,
          limit: 3 satisfies number,
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals("page1 count matches limit", page1.pagination.limit, 3);
  TestValidator.equals("page1 data length matches", page1.data.length, 3);
  TestValidator.equals(
    "page1 total records matches #patients",
    page1.pagination.records,
    patients.length,
  );
  // Confirm summary fields exist and match IHealthcarePlatformPatient.ISummary
  TestValidator.predicate(
    "page1 summary dtype matches",
    page1.data.every(
      (p) =>
        typeof p.id === "string" &&
        typeof p.email === "string" &&
        typeof p.full_name === "string" &&
        typeof p.created_at === "string",
    ),
  );

  // 4. Filter by full_name substring (use 2-letter partial matching first 3)
  const partial = patients[1].full_name.substring(0, 2);
  const nameFilter =
    await api.functional.healthcarePlatform.organizationAdmin.patients.index(
      connection,
      {
        body: {
          full_name: partial,
          page: 1 satisfies number,
          limit: 10 satisfies number,
        },
      },
    );
  typia.assert(nameFilter);
  const expected = patients.filter((p) =>
    p.full_name.toLowerCase().includes(partial.toLowerCase()),
  );
  TestValidator.equals(
    "filtered by name - correct count",
    nameFilter.data.length,
    expected.length,
  );
  for (const p of nameFilter.data) {
    TestValidator.predicate(
      `patient name includes '${partial}'`,
      p.full_name.toLowerCase().includes(partial.toLowerCase()),
    );
  }

  // 5. Filter by date_of_birth range (from 2nd to 4th patient, inclusive)
  const dobFrom = patients[1].date_of_birth.substring(0, 10);
  const dobTo = patients[3].date_of_birth.substring(0, 10);
  const dobRange =
    await api.functional.healthcarePlatform.organizationAdmin.patients.index(
      connection,
      {
        body: {
          date_of_birth_from: dobFrom as string & tags.Format<"date">,
          date_of_birth_to: dobTo as string & tags.Format<"date">,
          page: 1 satisfies number,
          limit: 10 satisfies number,
        },
      },
    );
  typia.assert(dobRange);
  const bmin = dobFrom;
  const bmax = dobTo;
  for (const p of dobRange.data) {
    TestValidator.predicate(
      `patient dob in range [${bmin},${bmax}]`,
      p.date_of_birth >= bmin && p.date_of_birth <= bmax,
    );
  }

  // 6. Filter by created_at range (from known patient)
  const createdPatient = patients[2];
  const cat = createdPatient.created_at;
  const regRange =
    await api.functional.healthcarePlatform.organizationAdmin.patients.index(
      connection,
      {
        body: {
          created_at_from: cat,
          created_at_to: cat,
          page: 1 satisfies number,
          limit: 5 satisfies number,
        },
      },
    );
  typia.assert(regRange);
  TestValidator.predicate(
    "all returned patients have created_at=cat",
    regRange.data.every((d) => d.created_at === cat),
  );

  // 7. Impossible filter (random string for full_name)
  const noneFilter =
    await api.functional.healthcarePlatform.organizationAdmin.patients.index(
      connection,
      {
        body: {
          full_name: RandomGenerator.paragraph({ sentences: 5 }),
          page: 1 satisfies number,
          limit: 5 satisfies number,
        },
      },
    );
  typia.assert(noneFilter);
  TestValidator.equals(
    "should return no results for non-matching filter",
    noneFilter.data.length,
    0,
  );

  // 8. Permission test: search without authentication (simulate unauth conn)
  const unauth = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot search patients",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patients.index(
        unauth,
        {
          body: { page: 1, limit: 1 },
        },
      );
    },
  );
}
