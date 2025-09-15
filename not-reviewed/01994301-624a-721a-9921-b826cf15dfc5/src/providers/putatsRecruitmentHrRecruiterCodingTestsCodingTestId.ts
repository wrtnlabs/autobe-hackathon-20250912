import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Update a specific coding test in the AtsRecruitment coding test table
 *
 * Updates an existing coding test record assigned to a job application. This
 * API allows an authorized HR recruiter to modify details related to the coding
 * test, such as scheduled time, delivery status, provider metadata, URL for
 * test access, expiration time, or current test state. It operates on the
 * ats_recruitment_coding_tests table and supports all updatable columns as
 * defined in the Prisma schema. Changes are logged in
 * ats_recruitment_audit_trails for compliance.
 *
 * Only the HR recruiter who owns this coding test can update it. Update fails
 * if test is already closed or expired. All date/datetime fields are handled as
 * strings; never use native Date type.
 *
 * @param props - Properties required to process the update
 * @param props.hrRecruiter - Authenticated HR recruiter handler (owner)
 * @param props.codingTestId - Unique coding test UUID to update
 * @param props.body - Fields to update, subset of
 *   IAtsRecruitmentCodingTest.IUpdate
 * @returns IAtsRecruitmentCodingTest - Updated coding test entity
 * @throws Error if not found, unauthorized, closed, or expired
 */
export async function putatsRecruitmentHrRecruiterCodingTestsCodingTestId(props: {
  hrRecruiter: HrrecruiterPayload;
  codingTestId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTest.IUpdate;
}): Promise<IAtsRecruitmentCodingTest> {
  const { hrRecruiter, codingTestId, body } = props;
  // Fetch coding test and verify ownership/soft delete
  const codingTest =
    await MyGlobal.prisma.ats_recruitment_coding_tests.findFirst({
      where: {
        id: codingTestId,
        deleted_at: null,
      },
    });
  if (!codingTest) throw new Error("Coding test not found or has been deleted");
  if (codingTest.ats_recruitment_hrrecruiter_id !== hrRecruiter.id)
    throw new Error(
      "Unauthorized: HR recruiter can only update their own test record",
    );
  // Block update if already closed
  if (codingTest.closed_at !== null)
    throw new Error("Cannot update a closed coding test");
  // Block update if already expired
  if (
    codingTest.expiration_at !== null &&
    toISOStringSafe(codingTest.expiration_at) < toISOStringSafe(new Date())
  ) {
    throw new Error("Cannot update an expired coding test");
  }
  // Prepare update data: only include supplied fields, convert all dates using toISOStringSafe
  const now = toISOStringSafe(new Date());
  const updateData = {
    ...(body.test_provider !== undefined && {
      test_provider: body.test_provider,
    }),
    ...(body.test_external_id !== undefined && {
      test_external_id: body.test_external_id,
    }),
    ...(body.test_url !== undefined && { test_url: body.test_url }),
    ...(body.scheduled_at !== undefined && {
      scheduled_at: toISOStringSafe(body.scheduled_at),
    }),
    ...(body.delivered_at !== undefined && {
      delivered_at:
        body.delivered_at !== null ? toISOStringSafe(body.delivered_at) : null,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.expiration_at !== undefined && {
      expiration_at:
        body.expiration_at !== null
          ? toISOStringSafe(body.expiration_at)
          : null,
    }),
    ...(body.callback_received_at !== undefined && {
      callback_received_at:
        body.callback_received_at !== null
          ? toISOStringSafe(body.callback_received_at)
          : null,
    }),
    ...(body.closed_at !== undefined && {
      closed_at:
        body.closed_at !== null ? toISOStringSafe(body.closed_at) : null,
    }),
    ...(body.deleted_at !== undefined && {
      deleted_at:
        body.deleted_at !== null ? toISOStringSafe(body.deleted_at) : null,
    }),
    updated_at: now,
  } satisfies IAtsRecruitmentCodingTest.IUpdate;
  // Perform update
  const updated = await MyGlobal.prisma.ats_recruitment_coding_tests.update({
    where: { id: codingTestId },
    data: updateData,
  });
  // Record audit trail (all changes)
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4(),
      event_timestamp: now,
      actor_id: hrRecruiter.id,
      actor_role: "hrRecruiter",
      operation_type: "UPDATE",
      target_type: "ats_recruitment_coding_tests",
      target_id: codingTestId,
      event_detail: JSON.stringify({
        before: {
          ...codingTest,
          scheduled_at: toISOStringSafe(codingTest.scheduled_at),
          delivered_at:
            codingTest.delivered_at !== null
              ? toISOStringSafe(codingTest.delivered_at)
              : null,
          expiration_at:
            codingTest.expiration_at !== null
              ? toISOStringSafe(codingTest.expiration_at)
              : null,
          callback_received_at:
            codingTest.callback_received_at !== null
              ? toISOStringSafe(codingTest.callback_received_at)
              : null,
          closed_at:
            codingTest.closed_at !== null
              ? toISOStringSafe(codingTest.closed_at)
              : null,
          created_at: toISOStringSafe(codingTest.created_at),
          updated_at: toISOStringSafe(codingTest.updated_at),
          deleted_at:
            codingTest.deleted_at !== null
              ? toISOStringSafe(codingTest.deleted_at)
              : null,
        },
        after: {
          ...updated,
          scheduled_at: toISOStringSafe(updated.scheduled_at),
          delivered_at:
            updated.delivered_at !== null
              ? toISOStringSafe(updated.delivered_at)
              : null,
          expiration_at:
            updated.expiration_at !== null
              ? toISOStringSafe(updated.expiration_at)
              : null,
          callback_received_at:
            updated.callback_received_at !== null
              ? toISOStringSafe(updated.callback_received_at)
              : null,
          closed_at:
            updated.closed_at !== null
              ? toISOStringSafe(updated.closed_at)
              : null,
          created_at: toISOStringSafe(updated.created_at),
          updated_at: toISOStringSafe(updated.updated_at),
          deleted_at:
            updated.deleted_at !== null
              ? toISOStringSafe(updated.deleted_at)
              : null,
        },
      }),
      ip_address: undefined,
      user_agent: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Return updated record
  return {
    id: updated.id,
    ats_recruitment_application_id: updated.ats_recruitment_application_id,
    ats_recruitment_applicant_id: updated.ats_recruitment_applicant_id,
    ats_recruitment_hrrecruiter_id: updated.ats_recruitment_hrrecruiter_id,
    test_provider: updated.test_provider,
    test_external_id:
      updated.test_external_id !== null ? updated.test_external_id : undefined,
    test_url: updated.test_url !== null ? updated.test_url : undefined,
    scheduled_at: toISOStringSafe(updated.scheduled_at),
    delivered_at:
      updated.delivered_at !== null
        ? toISOStringSafe(updated.delivered_at)
        : undefined,
    status: updated.status,
    expiration_at:
      updated.expiration_at !== null
        ? toISOStringSafe(updated.expiration_at)
        : undefined,
    callback_received_at:
      updated.callback_received_at !== null
        ? toISOStringSafe(updated.callback_received_at)
        : undefined,
    closed_at:
      updated.closed_at !== null
        ? toISOStringSafe(updated.closed_at)
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
